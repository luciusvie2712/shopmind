import type { OrderPaymentSummary } from '@shopmind/contracts';
import type { Payment } from '@prisma/client';

export function toDemoPaymentSummary(payment: Payment): OrderPaymentSummary {
  const reference = payment.reference ?? `SM-${payment.orderId}`;
  const amount = payment.amount.toFixed(2);
  return {
    id: payment.id,
    provider: 'SIMULATED',
    status: payment.status,
    amount: Number(payment.amount),
    currency: payment.currency.toUpperCase(),
    reference,
    qrPayload: `SHOPMIND DEMO PAYMENT\nORDER=${payment.orderId}\nREFERENCE=${reference}\nAMOUNT=${amount}\nCURRENCY=${payment.currency.toUpperCase()}\nNO_REAL_TRANSACTION=true`,
    paidAt: payment.paidAt?.toISOString() ?? null,
  };
}
