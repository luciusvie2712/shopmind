import { reviewSetHash } from './review-set-hash';

describe('reviewSetHash', () => {
  const review = {
    id: 'a',
    rating: 5,
    comment: 'Great',
    reviewedAt: new Date('2026-01-01T00:00:00Z'),
  };
  it('is deterministic and changes with canonical content', () => {
    expect(reviewSetHash([review])).toBe(reviewSetHash([review]));
    expect(reviewSetHash([review])).not.toBe(
      reviewSetHash([{ ...review, comment: 'Changed' }]),
    );
  });
  it('represents an empty review set deterministically', () => {
    expect(reviewSetHash([])).toHaveLength(64);
  });
});
