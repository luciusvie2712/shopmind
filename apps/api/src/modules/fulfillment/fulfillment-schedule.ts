import { FulfillmentScenario, FulfillmentStatus } from '@prisma/client';
import { config } from '../../common/config';
import { finalStatusForScenario } from './fulfillment-state-machine';

export interface ScheduledFulfillmentTransition {
  readonly targetStatus: FulfillmentStatus;
  readonly scheduledFor: Date;
}

export function buildFulfillmentSchedule(
  startedAt: Date,
  scenario: FulfillmentScenario,
): readonly ScheduledFulfillmentTransition[] {
  const transitAt = startedAt.getTime() + config.demo.receivedToTransitMs;
  const outAt = transitAt + config.demo.transitToOutForDeliveryMs;
  const finalAt = outAt + config.demo.outForDeliveryToFinalMs;
  return [
    {
      targetStatus: FulfillmentStatus.IN_TRANSIT,
      scheduledFor: new Date(transitAt),
    },
    {
      targetStatus: FulfillmentStatus.OUT_FOR_DELIVERY,
      scheduledFor: new Date(outAt),
    },
    {
      targetStatus: finalStatusForScenario(scenario),
      scheduledFor: new Date(finalAt),
    },
  ];
}

export function fulfillmentTransitionDelay(
  scheduledFor: Date,
  now = new Date(),
): number {
  return Math.max(0, scheduledFor.getTime() - now.getTime());
}
