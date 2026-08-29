import { type JobsOptions } from 'bullmq';

export const QUEUE_NAMES = {
  ingestion: 'ingestion',
  embedding: 'embedding',
  reviewSummary: 'review-summary',
  fulfillment: 'fulfillment',
} as const;

export const JOB_NAMES = {
  syncProducts: 'SYNC_PRODUCTS',
  embedProduct: 'EMBED_PRODUCT',
  summarizeReviews: 'SUMMARIZE_REVIEWS',
  fulfillmentTransition: 'FULFILLMENT_TRANSITION',
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

export interface ReviewSummaryJobData {
  readonly productId: string;
  readonly reviewSetHash: string;
}

export interface FulfillmentTransitionJobData {
  readonly fulfillmentId: string;
  readonly targetStatus:
    'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELIVERY_FAILED';
  readonly scheduledFor: string;
}

export const FULFILLMENT_TRANSITION_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 86_400, count: 500 },
  removeOnFail: { age: 604_800, count: 500 },
} as const satisfies JobsOptions;

export function fulfillmentTransitionJobId(
  data: Pick<FulfillmentTransitionJobData, 'fulfillmentId' | 'targetStatus'>,
): string {
  return `fulfillment:${data.fulfillmentId}:${data.targetStatus}`;
}

export const REVIEW_SUMMARY_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 86_400, count: 100 },
  removeOnFail: { age: 604_800, count: 500 },
} as const satisfies JobsOptions;

export function reviewSummaryJobId(data: ReviewSummaryJobData): string {
  return `review-summary:${data.productId}:${data.reviewSetHash}`;
}

export function embeddingJobId(data: EmbedProductJobData): string {
  return `embed:${data.productId}:${data.contentHash}`;
}
