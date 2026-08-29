import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { FulfillmentTransitionJobData } from '../../common/queue/queue.constants';
import { FulfillmentService } from './fulfillment.service';

@Injectable()
export class FulfillmentProcessor {
  constructor(private readonly fulfillment: FulfillmentService) {}
  async process(job: Job<FulfillmentTransitionJobData>): Promise<void> {
    await this.fulfillment.transition(
      job.data.fulfillmentId,
      job.data.targetStatus,
    );
  }
}
