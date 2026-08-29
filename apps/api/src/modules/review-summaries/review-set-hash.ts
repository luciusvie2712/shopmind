import { createHash } from 'node:crypto';

export interface CanonicalReviewHashInput {
  readonly id: string;
  readonly rating: { toString(): string } | number;
  readonly comment: string;
  readonly reviewedAt: Date;
}

export function reviewSetHash(
  reviews: readonly CanonicalReviewHashInput[],
): string {
  const canonical = reviews.map((review) => ({
    id: review.id,
    rating: review.rating.toString(),
    comment: review.comment,
    reviewedAt: review.reviewedAt.toISOString(),
  }));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
