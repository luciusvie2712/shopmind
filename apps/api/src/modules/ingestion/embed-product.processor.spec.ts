import { decideEmbeddingJob } from './embed-product.processor';

describe('embedding job decision', () => {
  it('processes only the current canonical content version', () => {
    expect(decideEmbeddingJob('current', 'current')).toBe('process');
    expect(decideEmbeddingJob('current', 'old')).toBe('stale');
    expect(decideEmbeddingJob(undefined, 'old')).toBe('missing');
    expect(decideEmbeddingJob('current', 'current', 'current')).toBe(
      'unchanged',
    );
    expect(decideEmbeddingJob('current', 'current', 'old')).toBe('process');
    expect(decideEmbeddingJob('current', 'old', 'current')).toBe('stale');
  });
});
