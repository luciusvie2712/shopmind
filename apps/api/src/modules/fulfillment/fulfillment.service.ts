import { Injectable, Logger } from '@nestjs/common';
import { FulfillmentStatus } from '@prisma/client';
import { QueueService } from '../../common/queue/queue.service';
import {
  buildFulfillmentSchedule,
  fulfillmentTransitionDelay,
} from './fulfillment-schedule';
import {
  FulfillmentRepository,
  InvalidFulfillmentTransitionError,
  type FulfillmentRecord,
} from './fulfillment.repository';

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);
  constructor(
    private readonly repository: FulfillmentRepository,
    private readonly queue: QueueService,
  ) {}

  async schedule(fulfillment: FulfillmentRecord): Promise<void> {
    for (const transition of buildFulfillmentSchedule(
      fulfillment.startedAt,
      fulfillment.scenario,
    )) {
      await this.queue.enqueueFulfillmentTransition(
        {
          fulfillmentId: fulfillment.id,
          targetStatus: transition.targetStatus as Exclude<
            FulfillmentStatus,
            'ORDER_RECEIVED'
          >,
          scheduledFor: transition.scheduledFor.toISOString(),
        },
        fulfillmentTransitionDelay(transition.scheduledFor),
      );
      this.logger.log({
        operation: 'fulfillment_job_enqueued',
        fulfillmentId: fulfillment.id,
        targetStatus: transition.targetStatus,
      });
    }
  }

  async transition(
    fulfillmentId: string,
    targetStatus: FulfillmentStatus,
  ): Promise<'applied' | 'noop'> {
    try {
      const result = await this.repository.transition(
        fulfillmentId,
        targetStatus,
      );
      this.logger.log({
        operation:
          result === 'applied'
            ? 'fulfillment_transition_completed'
            : 'fulfillment_transition_noop',
        fulfillmentId,
        targetStatus,
      });
      return result;
    } catch (error) {
      if (error instanceof InvalidFulfillmentTransitionError) throw error;
      this.logger.error({
        operation: 'fulfillment_transition_failed',
        fulfillmentId,
        targetStatus,
      });
      throw error;
    }
  }

  async reconcile(): Promise<number> {
    const active = await this.repository.listActive();
    for (const fulfillment of active) await this.schedule(fulfillment);
    if (active.length)
      this.logger.log({
        operation: 'fulfillment_reconciled',
        count: active.length,
      });
    return active.length;
  }
}
