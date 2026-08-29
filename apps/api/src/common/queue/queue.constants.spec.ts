import {
  EMBED_PRODUCT_OPTIONS,
  embeddingJobId,
  SYNC_PRODUCTS_OPTIONS,
  FULFILLMENT_TRANSITION_OPTIONS,
  fulfillmentTransitionJobId,
} from './queue.constants';

describe('queue contracts', () => {
  it('builds the source-defined deterministic embedding job ID', () => {
    expect(
      embeddingJobId({ productId: 'product-id', contentHash: 'content-hash' }),
    ).toBe('embed:product-id:content-hash');
  });

  it('uses bounded exponential retries', () => {
    expect(SYNC_PRODUCTS_OPTIONS).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential' },
    });
    expect(EMBED_PRODUCT_OPTIONS).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential' },
    });
    expect(FULFILLMENT_TRANSITION_OPTIONS).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential' },
    });
  });

  it('builds deterministic fulfillment job IDs', () => {
    expect(
      fulfillmentTransitionJobId({
        fulfillmentId: 'fulfillment-id',
        targetStatus: 'DELIVERED',
      }),
    ).toBe('fulfillment:fulfillment-id:DELIVERED');
  });
});
