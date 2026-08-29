import type { ReviewSummaryContract } from '@shopmind/contracts';
import { Injectable } from '@nestjs/common';
import { ReviewSummaryStatus } from '@prisma/client';
import { QueueService } from '../../common/queue/queue.service';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { ReviewSummaryRepository } from './review-summary.repository';
import { reviewSetHash } from './review-set-hash';

const MIN_REVIEWS = 2;
const empty = {
  themes: [],
  positives: [],
  negatives: [],
  caveats: [],
} as const;

@Injectable()
export class ReviewSummaryService {
  constructor(
    private readonly repository: ReviewSummaryRepository,
    private readonly queue: QueueService,
  ) {}

  async get(productId: string): Promise<ReviewSummaryContract> {
    const state = await this.repository.findState(productId);
    if (state === null)
      throw new ApiException(
        ERROR_CODES.PRODUCT_NOT_FOUND,
        'Product was not found',
      );
    if (state.reviews.length < MIN_REVIEWS)
      return {
        status: 'unavailable',
        reviewCount: state.reviews.length,
        ...empty,
      };
    const hash = reviewSetHash(state.reviews);
    const summary = state.reviewSummary;
    if (summary?.reviewSetHash === hash) return this.toContract(summary);
    await this.repository.markPending(productId, hash, state.reviews.length);
    try {
      await this.queue.enqueueReviewSummary({ productId, reviewSetHash: hash });
    } catch {
      await this.repository.markFailed(productId, hash, 'QUEUE_UNAVAILABLE');
      return {
        status: 'failed',
        reviewCount: state.reviews.length,
        reviewSetHash: hash,
        ...empty,
      };
    }
    return {
      status: 'pending',
      reviewCount: state.reviews.length,
      reviewSetHash: hash,
      ...empty,
    };
  }

  private toContract(summary: {
    status: ReviewSummaryStatus;
    reviewCount: number;
    reviewSetHash: string;
    themes: unknown;
    positives: unknown;
    negatives: unknown;
    caveats: unknown;
    updatedAt: Date;
  }): ReviewSummaryContract {
    const list = (value: unknown): readonly string[] =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
    return {
      status: summary.status.toLowerCase() as 'pending' | 'ready' | 'failed',
      reviewCount: summary.reviewCount,
      reviewSetHash: summary.reviewSetHash,
      themes: list(summary.themes),
      positives: list(summary.positives),
      negatives: list(summary.negatives),
      caveats: list(summary.caveats),
      updatedAt: summary.updatedAt.toISOString(),
    };
  }
}
