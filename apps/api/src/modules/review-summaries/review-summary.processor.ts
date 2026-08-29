import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { config } from '../../common/config';
import {
  type ReviewSummaryJobData,
  QUEUE_NAMES,
} from '../../common/queue/queue.constants';
import {
  AI_SEARCH_PROVIDER,
  type AiProvider,
} from '../ai/provider/ai-provider';
import { ReviewSummaryRepository } from './review-summary.repository';
import { reviewSetHash } from './review-set-hash';

@Injectable()
export class ReviewSummaryProcessor {
  private readonly logger = new Logger(ReviewSummaryProcessor.name);
  constructor(
    private readonly repository: ReviewSummaryRepository,
    @Inject(AI_SEARCH_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async process(
    job: Job<ReviewSummaryJobData>,
  ): Promise<'ready' | 'stale' | 'missing'> {
    const state = await this.repository.findState(job.data.productId);
    if (state === null) return 'missing';
    if (reviewSetHash(state.reviews) !== job.data.reviewSetHash) return 'stale';
    try {
      const output = await this.provider.summarizeReviews({
        productId: state.id,
        reviews: state.reviews.slice(0, 100).map((review) => ({
          rating: Number(review.rating),
          comment: review.comment.slice(0, 2_000),
        })),
      });
      const persisted = await this.repository.markReady({
        productId: state.id,
        reviewSetHash: job.data.reviewSetHash,
        output,
        provider: 'gemini',
        model: config.gemini.model,
      });
      return persisted ? 'ready' : 'stale';
    } catch (error) {
      await this.repository.markFailed(
        state.id,
        job.data.reviewSetHash,
        error instanceof Error ? error.name.slice(0, 50) : 'UNKNOWN',
      );
      this.logger.error({
        queue: QUEUE_NAMES.reviewSummary,
        jobId: job.id,
        productId: state.id,
        status: 'failure',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
  }
}
