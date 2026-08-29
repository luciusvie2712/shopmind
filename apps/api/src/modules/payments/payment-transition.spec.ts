import { PaymentStatus } from '@prisma/client';
import { canApplyPaymentTransition } from './payment.repository';

describe('payment webhook transitions', () => {
  it('does not let late events downgrade a terminal payment', () => {
    expect(
      canApplyPaymentTransition(
        PaymentStatus.SUCCEEDED,
        PaymentStatus.PROCESSING,
      ),
    ).toBe(false);
    expect(
      canApplyPaymentTransition(PaymentStatus.SUCCEEDED, PaymentStatus.FAILED),
    ).toBe(false);
    expect(
      canApplyPaymentTransition(
        PaymentStatus.CANCELED,
        PaymentStatus.SUCCEEDED,
      ),
    ).toBe(false);
  });

  it('allows retries to progress from failure to processing or success', () => {
    expect(
      canApplyPaymentTransition(PaymentStatus.FAILED, PaymentStatus.PROCESSING),
    ).toBe(true);
    expect(
      canApplyPaymentTransition(PaymentStatus.FAILED, PaymentStatus.SUCCEEDED),
    ).toBe(true);
  });
});
