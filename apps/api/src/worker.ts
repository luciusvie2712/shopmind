import { NestFactory } from '@nestjs/core';
import { Worker } from 'bullmq';
import { AppModule } from './app.module';
import { queueConnectionOptions } from './common/queue/queue.connection';
import {
  type EmbedProductJobData,
  JOB_NAMES,
  QUEUE_NAMES,
  type SyncProductsJobData,
} from './common/queue/queue.constants';
import { EmbedProductProcessor } from './modules/ingestion/embed-product.processor';
import { SyncProductsProcessor } from './modules/ingestion/sync-products.processor';
import { StructuredLogger } from './common/logging/structured-logger';
import { registerWorkerObservability } from './common/queue/worker-observability';

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger();
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger,
  });
  const syncProducts = application.get(SyncProductsProcessor);
  const embedProduct = application.get(EmbedProductProcessor);
  const ingestionWorker = new Worker<SyncProductsJobData>(
    QUEUE_NAMES.ingestion,
    async (job) => {
      if (job.name !== JOB_NAMES.syncProducts) {
        throw new Error(`Unsupported ingestion job: ${job.name}`);
      }
      await syncProducts.process(job);
    },
    { connection: queueConnectionOptions(), concurrency: 1 },
  );
  const embeddingWorker = new Worker<EmbedProductJobData>(
    QUEUE_NAMES.embedding,
    async (job) => {
      if (job.name !== JOB_NAMES.embedProduct) {
        throw new Error(`Unsupported embedding job: ${job.name}`);
      }
      await embedProduct.process(job);
    },
    { connection: queueConnectionOptions(), concurrency: 2 },
  );
  const workers = [ingestionWorker, embeddingWorker];
  workers.forEach((worker) => registerWorkerObservability(worker, logger));

  let isClosing = false;
  const shutdown = async (): Promise<void> => {
    if (isClosing) return;
    isClosing = true;
    await Promise.all(workers.map((worker) => worker.close()));
    await application.close();
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());

  logger.log({
    operation: 'worker_bootstrap',
    status: 'ready',
    queues: workers.map((worker) => worker.name),
  });
}

void bootstrap();
