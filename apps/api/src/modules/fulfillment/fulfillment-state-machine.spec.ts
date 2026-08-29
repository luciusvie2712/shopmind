import { FulfillmentScenario, FulfillmentStatus } from '@prisma/client';
import {
  canTransitionFulfillment,
  finalStatusForScenario,
  isTerminalFulfillmentStatus,
} from './fulfillment-state-machine';

describe('fulfillment state machine', () => {
  it.each([
    [FulfillmentStatus.ORDER_RECEIVED, FulfillmentStatus.IN_TRANSIT],
    [FulfillmentStatus.IN_TRANSIT, FulfillmentStatus.OUT_FOR_DELIVERY],
    [FulfillmentStatus.OUT_FOR_DELIVERY, FulfillmentStatus.DELIVERED],
    [FulfillmentStatus.OUT_FOR_DELIVERY, FulfillmentStatus.DELIVERY_FAILED],
  ])('allows %s -> %s', (current, target) =>
    expect(canTransitionFulfillment(current, target)).toBe(true),
  );

  it.each([
    [FulfillmentStatus.IN_TRANSIT, FulfillmentStatus.ORDER_RECEIVED],
    [FulfillmentStatus.DELIVERED, FulfillmentStatus.IN_TRANSIT],
    [FulfillmentStatus.DELIVERY_FAILED, FulfillmentStatus.ORDER_RECEIVED],
  ])('rejects %s -> %s', (current, target) =>
    expect(canTransitionFulfillment(current, target)).toBe(false),
  );

  it('keeps terminal states immutable and chooses deterministic outcomes', () => {
    expect(isTerminalFulfillmentStatus(FulfillmentStatus.DELIVERED)).toBe(true);
    expect(isTerminalFulfillmentStatus(FulfillmentStatus.DELIVERY_FAILED)).toBe(
      true,
    );
    expect(finalStatusForScenario(FulfillmentScenario.SUCCESS)).toBe(
      FulfillmentStatus.DELIVERED,
    );
    expect(finalStatusForScenario(FulfillmentScenario.FAILURE)).toBe(
      FulfillmentStatus.DELIVERY_FAILED,
    );
  });
});
