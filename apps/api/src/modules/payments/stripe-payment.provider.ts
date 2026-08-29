import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { config } from '../../common/config';

const paymentIntentSchema = z.object({
  id: z.string().min(1),
  client_secret: z.string().min(1),
  status: z.string(),
});
export interface StripePaymentIntent {
  readonly id: string;
  readonly clientSecret: string;
  readonly status: string;
}

@Injectable()
export class StripePaymentProvider {
  async create(input: {
    readonly amountCents: number;
    readonly currency: string;
    readonly orderId: string;
    readonly idempotencyKey: string;
  }): Promise<StripePaymentIntent> {
    const body = new URLSearchParams({
      amount: String(input.amountCents),
      currency: input.currency,
      'automatic_payment_methods[enabled]': 'true',
      'metadata[order_id]': input.orderId,
    });
    return this.request('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': input.idempotencyKey },
    });
  }
  retrieve(id: string): Promise<StripePaymentIntent> {
    return this.request(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(id)}`,
      { method: 'GET' },
    );
  }
  private async request(
    url: string,
    init: RequestInit,
  ): Promise<StripePaymentIntent> {
    if (!config.stripe.enabled || config.stripe.secretKey === undefined)
      throw new Error('Stripe test mode is not configured');
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${config.stripe.secretKey}`,
        ...(init.body === undefined
          ? {}
          : { 'content-type': 'application/x-www-form-urlencoded' }),
        ...init.headers,
      },
    });
    if (!response.ok)
      throw new Error(`Stripe returned HTTP ${response.status}`);
    const parsed = paymentIntentSchema.parse(await response.json());
    return {
      id: parsed.id,
      clientSecret: parsed.client_secret,
      status: parsed.status,
    };
  }
}
