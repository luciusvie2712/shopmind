import type { PaymentContract } from '@shopmind/contracts';
import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { config } from '../../common/config';
import { BadRequestException } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import {
  CheckoutOutOfStockError,
  CheckoutProductMissingError,
} from '../orders/order-calculation';
import { EmptyCartError } from '../orders/order.repository';
import { PaymentRepository } from './payment.repository';
import { StripePaymentProvider } from './stripe-payment.provider';

const stripeEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'payment_intent.processing',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
  ]),
  created: z.number().int().positive(),
  data: z.object({ object: z.object({ id: z.string().min(1) }).passthrough() }),
});

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly stripe: StripePaymentProvider,
  ) {}
  async create(
    userId: string,
    idempotencyKey: string,
  ): Promise<PaymentContract> {
    let payment = await this.repository.findByIdempotency(
      userId,
      idempotencyKey,
    );
    try {
      if (payment === null)
        payment = await this.repository.createPendingFromCart(
          userId,
          idempotencyKey,
          config.stripe.currency,
        );
    } catch (error) {
      if (error instanceof EmptyCartError)
        throw new BadRequestException('Cart must contain at least one item');
      if (error instanceof CheckoutProductMissingError)
        throw new ApiException(
          ERROR_CODES.PRODUCT_NOT_FOUND,
          'A cart product is no longer available',
        );
      if (error instanceof CheckoutOutOfStockError)
        throw new ApiException(
          ERROR_CODES.OUT_OF_STOCK,
          'A cart quantity exceeds current stock',
        );
      throw error;
    }
    const intent = payment.providerPaymentId
      ? await this.stripe.retrieve(payment.providerPaymentId)
      : await this.stripe.create({
          amountCents: Math.round(Number(payment.amount) * 100),
          currency: payment.currency,
          orderId: payment.orderId,
          idempotencyKey: payment.idempotencyKey,
        });
    if (!payment.providerPaymentId)
      payment = await this.repository.attachProvider(payment.id, intent.id);
    return {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      clientSecret: intent.clientSecret,
    };
  }
  handleWebhook(payload: unknown) {
    const event = stripeEventSchema.parse(payload);
    const transitions = {
      'payment_intent.processing': [
        PaymentStatus.PROCESSING,
        'PAYMENT_PROCESSING',
      ],
      'payment_intent.succeeded': [PaymentStatus.SUCCEEDED, 'PAID'],
      'payment_intent.payment_failed': [PaymentStatus.FAILED, 'PAYMENT_FAILED'],
      'payment_intent.canceled': [PaymentStatus.CANCELED, 'PAYMENT_CANCELED'],
    } as const;
    const [status, orderStatus] = transitions[event.type];
    return this.repository.applyWebhook({
      eventId: event.id,
      type: event.type,
      providerCreated: new Date(event.created * 1000),
      providerPaymentId: event.data.object.id,
      status,
      orderStatus,
    });
  }
}
