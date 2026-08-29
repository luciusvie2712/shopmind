import { config } from '../../common/config';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import type { FulfillmentService } from '../fulfillment/fulfillment.service';
import type { DemoPaymentRepository } from './demo-payment.repository';
import { DemoPaymentsService } from './demo-payments.service';

describe('DemoPaymentsService feature flags', () => {
  const repository = {} as DemoPaymentRepository;
  const fulfillment = {} as FulfillmentService;
  const demoFlags = config.demo as {
    paymentEnabled: boolean;
    fulfillmentEnabled: boolean;
  };
  const originalPaymentEnabled = demoFlags.paymentEnabled;
  const originalFulfillmentEnabled = demoFlags.fulfillmentEnabled;

  afterEach(() => {
    demoFlags.paymentEnabled = originalPaymentEnabled;
    demoFlags.fulfillmentEnabled = originalFulfillmentEnabled;
  });

  it('rejects presentation and confirmation when payment simulation is disabled', async () => {
    demoFlags.paymentEnabled = false;
    const service = new DemoPaymentsService(repository, fulfillment);

    await expect(service.get('order-id', 'user-id')).rejects.toMatchObject({
      code: ERROR_CODES.PAYMENT_SIMULATION_DISABLED,
    } satisfies Partial<ApiException>);
    await expect(
      service.confirm('order-id', 'user-id', 'SUCCESS'),
    ).rejects.toMatchObject({
      code: ERROR_CODES.PAYMENT_SIMULATION_DISABLED,
    } satisfies Partial<ApiException>);
  });

  it('rejects confirmation when demo fulfillment is disabled', async () => {
    demoFlags.paymentEnabled = true;
    demoFlags.fulfillmentEnabled = false;
    const service = new DemoPaymentsService(repository, fulfillment);

    await expect(
      service.confirm('order-id', 'user-id', 'SUCCESS'),
    ).rejects.toMatchObject({
      code: ERROR_CODES.FULFILLMENT_NOT_AVAILABLE,
    } satisfies Partial<ApiException>);
  });
});
