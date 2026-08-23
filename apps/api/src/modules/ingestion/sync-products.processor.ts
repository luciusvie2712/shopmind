import { Injectable, Logger } from '@nestjs/common';
import { type Job } from 'bullmq';
import {
  QUEUE_NAMES,
  type SyncProductsJobData,
} from '../../common/queue/queue.constants';
import { IngestionService } from './ingestion.service';

@Injectable()
export class SyncProductsProcessor {
  private readonly logger = new Logger(SyncProductsProcessor.name);

  constructor(private readonly ingestionService: IngestionService) {}

  async process(job: Job<SyncProductsJobData>): Promise<void> {
    const startedAt = performance.now();
    try {
      await this.ingestionService.importProducts();
      this.logger.log(this.fields(job, 'success', startedAt));
    } catch (error) {
      this.logger.error(this.fields(job, 'failure', startedAt, error));
      throw error;
    }
  }

  private fields(
    job: Job<SyncProductsJobData>,
    status: string,
    startedAt: number,
    error?: unknown,
  ) {
    return {
      queue: QUEUE_NAMES.ingestion,
      jobName: job.name,
      jobId: job.id,
      attempt: job.attemptsMade + 1,
      status,
      latencyMs: Number((performance.now() - startedAt).toFixed(2)),
      ...(error === undefined
        ? {}
        : { errorType: error instanceof Error ? error.name : 'UnknownError' }),
    };
  }
}
