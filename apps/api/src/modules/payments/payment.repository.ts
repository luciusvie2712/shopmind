import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import { calculateCheckout } from '../orders/order-calculation';
import { EmptyCartError } from '../orders/order.repository';

interface LockedCartItem {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
}

export function canApplyPaymentTransition(
  current: PaymentStatus,
  next: PaymentStatus,
): boolean {
  if (current === next) return true;
  if (current === PaymentStatus.SUCCEEDED || current === PaymentStatus.CANCELED)
    return false;
  if (next === PaymentStatus.SUCCEEDED) return true;
  if (next === PaymentStatus.CANCELED) return true;
  if (next === PaymentStatus.PROCESSING)
    return (
      current === PaymentStatus.REQUIRES_PAYMENT ||
      current === PaymentStatus.FAILED
    );
  return (
    next === PaymentStatus.FAILED &&
    (current === PaymentStatus.REQUIRES_PAYMENT ||
      current === PaymentStatus.PROCESSING)
  );
}

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}
  findByIdempotency(userId: string, idempotencyKey: string) {
    return this.prisma.payment.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
  }
  createPendingFromCart(
    userId: string,
    idempotencyKey: string,
    currency: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      if (existing) return existing;
      const cartItems = await tx.$queryRaw<LockedCartItem[]>(Prisma.sql`
        SELECT ci.id, ci.product_id AS "productId", ci.quantity FROM cart_items ci
        INNER JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = ${userId}::uuid
        ORDER BY ci.id FOR UPDATE OF ci
      `);
      if (cartItems.length === 0) throw new EmptyCartError();
      const products = await tx.product.findMany({
        where: {
          id: { in: cartItems.map(({ productId }) => productId) },
          sourceStatus: SOURCE_STATUS.active,
        },
        select: { id: true, title: true, price: true, stock: true },
      });
      const checkout = calculateCheckout(cartItems, products);
      const order = await tx.order.create({
        data: {
          userId,
          status: 'PAYMENT_PENDING',
          subtotal: checkout.subtotal,
          total: checkout.subtotal,
          items: { create: [...checkout.items] },
        },
      });
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          idempotencyKey,
          amount: checkout.subtotal,
          currency,
          status: PaymentStatus.REQUIRES_PAYMENT,
        },
      });
      await tx.cartItem.deleteMany({
        where: { id: { in: cartItems.map(({ id }) => id) } },
      });
      return payment;
    });
  }
  attachProvider(paymentId: string, providerPaymentId: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { providerPaymentId },
    });
  }
  async applyWebhook(input: {
    readonly eventId: string;
    readonly type: string;
    readonly providerCreated: Date;
    readonly providerPaymentId: string;
    readonly status: PaymentStatus;
    readonly orderStatus: string;
  }): Promise<'processed' | 'duplicate' | 'ignored'> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.paymentWebhookEvent.create({
          data: {
            id: input.eventId,
            type: input.type,
            providerCreated: input.providerCreated,
          },
        });
        const payment = await tx.payment.findUnique({
          where: { providerPaymentId: input.providerPaymentId },
        });
        if (!payment) return 'ignored';
        if (!canApplyPaymentTransition(payment.status, input.status))
          return 'ignored';
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: input.status },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: input.orderStatus },
        });
        return 'processed';
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        return 'duplicate';
      throw error;
    }
  }
}
