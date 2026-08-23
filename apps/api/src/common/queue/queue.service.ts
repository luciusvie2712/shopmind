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

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.ingestion.close(), this.embedding.close()]);
  }
}
