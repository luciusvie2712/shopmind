import { FulfillmentScenario, FulfillmentStatus } from '@prisma/client';

const nextByStatus: Readonly<
  Record<FulfillmentStatus, readonly FulfillmentStatus[]>
> = {
  ORDER_RECEIVED: [FulfillmentStatus.IN_TRANSIT],
  IN_TRANSIT: [FulfillmentStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [
    FulfillmentStatus.DELIVERED,
    FulfillmentStatus.DELIVERY_FAILED,
  ],
  DELIVERED: [],
  DELIVERY_FAILED: [],
};

export function isTerminalFulfillmentStatus(
  status: FulfillmentStatus,
): boolean {
  return (
    status === FulfillmentStatus.DELIVERED ||
    status === FulfillmentStatus.DELIVERY_FAILED
  );
}

export function canTransitionFulfillment(
  current: FulfillmentStatus,
  target: FulfillmentStatus,
): boolean {
  return current === target || nextByStatus[current].includes(target);
}

export function finalStatusForScenario(
  scenario: FulfillmentScenario,
): FulfillmentStatus {
  return scenario === FulfillmentScenario.FAILURE
    ? FulfillmentStatus.DELIVERY_FAILED
    : FulfillmentStatus.DELIVERED;
}

export function nextStatusForFulfillment(
  status: FulfillmentStatus,
  scenario: FulfillmentScenario,
): FulfillmentStatus | null {
  if (status === FulfillmentStatus.ORDER_RECEIVED)
    return FulfillmentStatus.IN_TRANSIT;
  if (status === FulfillmentStatus.IN_TRANSIT)
    return FulfillmentStatus.OUT_FOR_DELIVERY;
  if (status === FulfillmentStatus.OUT_FOR_DELIVERY)
    return finalStatusForScenario(scenario);
  return null;
}
