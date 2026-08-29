import { PaymentStatus, Prisma } from '@prisma/client';
import { toDemoPaymentSummary } from './demo-payment.mapper';

describe('demo payment presentation', () => {
  it('uses canonical stored amount/reference and marks the QR as non-real', () => {
    const payment = {
      id: '10000000-0000-4000-8000-000000000001',
      orderId: '20000000-0000-4000-8000-000000000001',
      userId: '30000000-0000-4000-8000-000000000001',
      provider: 'SIMULATED',
      reference: 'SM-REFERENCE',
      providerPaymentId: null,
      idempotencyKey: '40000000-0000-4000-8000-000000000001',
      status: PaymentStatus.PENDING,
      amount: new Prisma.Decimal('899.99'),
      currency: 'usd',
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = toDemoPaymentSummary(payment);
    expect(result.amount).toBe(899.99);
    expect(result.qrPayload).toContain('REFERENCE=SM-REFERENCE');
    expect(result.qrPayload).toContain('AMOUNT=899.99');
    expect(result.qrPayload).toContain('NO_REAL_TRANSACTION=true');
  });
});
