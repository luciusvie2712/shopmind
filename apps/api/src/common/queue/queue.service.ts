import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { queueConnectionOptions } from './queue.connection';
import {
  EMBED_PRODUCT_OPTIONS,
  type EmbedProductJobData,
  embeddingJobId,
  JOB_NAMES,
  QUEUE_NAMES,
  SYNC_PRODUCTS_OPTIONS,
  type SyncProductsJobData,
  type ReviewSummaryJobData,
  REVIEW_SUMMARY_OPTIONS,
  reviewSummaryJobId,
} from './queue.constants';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly ingestion = new Queue<SyncProductsJobData>(
    QUEUE_NAMES.ingestion,
    { connection: queueConnectionOptions() },
  );
  private readonly embedding = new Queue<EmbedProductJobData>(
    QUEUE_NAMES.embedding,
    { connection: queueConnectionOptions() },
  );
  private readonly reviewSummary = new Queue<ReviewSummaryJobData>(
    QUEUE_NAMES.reviewSummary,
    { connection: queueConnectionOptions() },
  );

  async enqueueSyncProducts(): Promise<{ readonly jobId: string }> {
    const job = await this.ingestion.add(
      JOB_NAMES.syncProducts,
      {},
      SYNC_PRODUCTS_OPTIONS,
    );
    if (job.id === undefined) throw new Error('BullMQ did not assign a job ID');
    return { jobId: job.id };
  }

  async enqueueEmbedProduct(data: EmbedProductJobData): Promise<void> {
    await this.embedding.add(JOB_NAMES.embedProduct, data, {
      ...EMBED_PRODUCT_OPTIONS,
      jobId: embeddingJobId(data),
    });
  }

  async enqueueReviewSummary(data: ReviewSummaryJobData): Promise<void> {
    await this.reviewSummary.add(JOB_NAMES.summarizeReviews, data, {
      ...REVIEW_SUMMARY_OPTIONS,
      jobId: reviewSummaryJobId(data),
    });
  }

  async getOperationalSnapshot(): Promise<{
    readonly ingestion: QueueCounts;
    readonly embedding: QueueCounts;
    readonly reviewSummary: QueueCounts;
  }> {
    const [ingestion, embedding, reviewSummary] = await Promise.all([
      this.queueCounts(this.ingestion),
      this.queueCounts(this.embedding),
      this.queueCounts(this.reviewSummary),
    ]);
    return { ingestion, embedding, reviewSummary };
  }

  private async queueCounts(queue: Queue): Promise<QueueCounts> {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
    );
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.ingestion.close(),
      this.embedding.close(),
      this.reviewSummary.close(),
    ]);
  }
}

export interface QueueCounts {
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
}
