import type { FulfillmentSummary } from '@shopmind/contracts';
import { buildFulfillmentSchedule } from './fulfillment-schedule';
import type { FulfillmentRecord } from './fulfillment.repository';

export function toFulfillmentSummary(
  fulfillment: FulfillmentRecord,
): FulfillmentSummary {
  const schedule = buildFulfillmentSchedule(
    fulfillment.startedAt,
    fulfillment.scenario,
  );
  return {
    id: fulfillment.id,
    status: fulfillment.status,
    scenario: fulfillment.scenario,
    startedAt: fulfillment.startedAt.toISOString(),
    completedAt: fulfillment.completedAt?.toISOString() ?? null,
    expectedCompletionAt: schedule.at(-1)!.scheduledFor.toISOString(),
    timeline: fulfillment.events.map((event) => ({
      status: event.status,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
