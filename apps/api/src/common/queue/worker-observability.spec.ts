import type { Job } from 'bullmq';
import {
  EMBED_PRODUCT_OPTIONS,
  SYNC_PRODUCTS_OPTIONS,
} from './queue.constants';
import { workerLogFields } from './worker-observability';

describe('worker observability', () => {
  it('retains bounded failed jobs and bounded completed history', () => {
    for (const options of [SYNC_PRODUCTS_OPTIONS, EMBED_PRODUCT_OPTIONS]) {
      expect(options.removeOnFail).toEqual({ age: 604_800, count: 500 });
      expect(options.removeOnComplete).toEqual({ age: 86_400, count: 100 });
    }
  });

  it('reports the actual job identity and retry attempt', () => {
    const job = {
      id: 'job-1',
      name: 'EMBED_PRODUCT',
      attemptsMade: 2,
    } as Job;
    expect(
      workerLogFields('embedding', job, 'failed', 42, new TypeError()),
    ).toEqual({
      queue: 'embedding',
      jobName: 'EMBED_PRODUCT',
      jobId: 'job-1',
      attempt: 2,
      status: 'failed',
      latencyMs: 42,
      errorType: 'TypeError',
    });
  });
});
