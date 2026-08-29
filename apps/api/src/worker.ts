import { NestFactory } from '@nestjs/core';
import { Worker } from 'bullmq';
import { AppModule } from './app.module';
import { queueConnectionOptions } from './common/queue/queue.connection';
import {
  type EmbedProductJobData,
  JOB_NAMES,
  QUEUE_NAMES,
  type SyncProductsJobData,
  type ReviewSummaryJobData,
  type FulfillmentTransitionJobData,
} from './common/queue/queue.constants';
import { EmbedProductProcessor } from './modules/ingestion/embed-product.processor';
import { SyncProductsProcessor } from './modules/ingestion/sync-products.processor';
import { StructuredLogger } from './common/logging/structured-logger';
import { registerWorkerObservability } from './common/queue/worker-observability';
import { ReviewSummaryProcessor } from './modules/review-summaries/review-summary.processor';
import { FulfillmentProcessor } from './modules/fulfillment/fulfillment.processor';
import { FulfillmentService } from './modules/fulfillment/fulfillment.service';

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger();
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger,
  });
  const syncProducts = application.get(SyncProductsProcessor);
  const embedProduct = application.get(EmbedProductProcessor);
  const reviewSummary = application.get(ReviewSummaryProcessor);
  const fulfillment = application.get(FulfillmentProcessor);
  const fulfillmentService = application.get(FulfillmentService);
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
  const reviewSummaryWorker = new Worker<ReviewSummaryJobData>(
    QUEUE_NAMES.reviewSummary,
    async (job) => {
      if (job.name !== JOB_NAMES.summarizeReviews)
        throw new Error(`Unsupported review summary job: ${job.name}`);
      await reviewSummary.process(job);
    },
    { connection: queueConnectionOptions(), concurrency: 2 },
  );
  const fulfillmentWorker = new Worker<FulfillmentTransitionJobData>(
    QUEUE_NAMES.fulfillment,
    async (job) => {
      if (job.name !== JOB_NAMES.fulfillmentTransition)
        throw new Error(`Unsupported fulfillment job: ${job.name}`);
      await fulfillment.process(job);
    },
    { connection: queueConnectionOptions(), concurrency: 4 },
  );
  const workers = [
    ingestionWorker,
    embeddingWorker,
    reviewSummaryWorker,
    fulfillmentWorker,
  ];
  workers.forEach((worker) => registerWorkerObservability(worker, logger));

  let isClosing = false;
  await fulfillmentService.reconcile();
  const reconciliationTimer = setInterval(
    () => void fulfillmentService.reconcile(),
    60_000,
  );
  reconciliationTimer.unref();
  const shutdown = async (): Promise<void> => {
    if (isClosing) return;
    isClosing = true;
    clearInterval(reconciliationTimer);
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
