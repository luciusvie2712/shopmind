import { type JobsOptions } from 'bullmq';

export const QUEUE_NAMES = {
  ingestion: 'ingestion',
  embedding: 'embedding',
} as const;

export const JOB_NAMES = {
  syncProducts: 'SYNC_PRODUCTS',
  embedProduct: 'EMBED_PRODUCT',
} as const;

export const SYNC_PRODUCTS_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: { age: 86_400, count: 100 },
  removeOnFail: { age: 604_800, count: 500 },
} as const satisfies JobsOptions;

export const EMBED_PRODUCT_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 86_400, count: 100 },
  removeOnFail: { age: 604_800, count: 500 },
} as const satisfies JobsOptions;

export type SyncProductsJobData = Record<string, never>;

export interface EmbedProductJobData {
  readonly productId: string;
  readonly contentHash: string;
}

export function embeddingJobId(data: EmbedProductJobData): string {
  return `embed:${data.productId}:${data.contentHash}`;
}
