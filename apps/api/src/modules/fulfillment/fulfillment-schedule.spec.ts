import { FulfillmentScenario, FulfillmentStatus } from '@prisma/client';
import {
  buildFulfillmentSchedule,
  fulfillmentTransitionDelay,
} from './fulfillment-schedule';

describe('fulfillment schedule', () => {
  it('uses absolute T+20/T+55/T+90 timestamps and scenario final state', () => {
    const start = new Date('2026-08-29T00:00:00.000Z');
    const schedule = buildFulfillmentSchedule(
      start,
      FulfillmentScenario.FAILURE,
    );
    expect(
      schedule.map((item) => [
        item.targetStatus,
        item.scheduledFor.getTime() - start.getTime(),
      ]),
    ).toEqual([
      [FulfillmentStatus.IN_TRANSIT, 20_000],
      [FulfillmentStatus.OUT_FOR_DELIVERY, 55_000],
      [FulfillmentStatus.DELIVERY_FAILED, 90_000],
    ]);
  });
  it('clamps recovery delay to zero', () => {
    expect(fulfillmentTransitionDelay(new Date(1_000), new Date(2_000))).toBe(
      0,
    );
  });
});
