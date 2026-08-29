import { Injectable } from '@nestjs/common';
import { ReviewSummaryStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { ReviewSummaryOutput } from '../ai/review-summary.schema';

@Injectable()
export class ReviewSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findState(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        reviews: {
          orderBy: [{ reviewedAt: 'asc' }, { id: 'asc' }],
          select: { id: true, rating: true, comment: true, reviewedAt: true },
        },
        reviewSummary: true,
      },
    });
  }

  async markPending(
    productId: string,
    reviewSetHash: string,
    reviewCount: number,
  ): Promise<void> {
    await this.prisma.productReviewSummary.upsert({
      where: { productId },
      create: { productId, reviewSetHash, reviewCount },
      update: {
        reviewSetHash,
        reviewCount,
        status: ReviewSummaryStatus.PENDING,
        themes: [],
        positives: [],
        negatives: [],
        caveats: [],
        provider: null,
        model: null,
        errorCode: null,
      },
    });
  }

  async markReady(input: {
    readonly productId: string;
    readonly reviewSetHash: string;
    readonly output: ReviewSummaryOutput;
    readonly provider: string;
    readonly model: string;
  }): Promise<boolean> {
    const result = await this.prisma.productReviewSummary.updateMany({
      where: { productId: input.productId, reviewSetHash: input.reviewSetHash },
      data: {
        status: ReviewSummaryStatus.READY,
        themes: input.output.themes,
        positives: input.output.positives,
        negatives: input.output.negatives,
        caveats: input.output.caveats,
        provider: input.provider,
        model: input.model,
        errorCode: null,
      },
    });
    return result.count === 1;
  }

  async markFailed(
    productId: string,
    reviewSetHash: string,
    errorCode: string,
  ): Promise<void> {
    await this.prisma.productReviewSummary.updateMany({
      where: { productId, reviewSetHash },
      data: { status: ReviewSummaryStatus.FAILED, errorCode },
    });
  }
}
