import type { AdminAnalyticsOverviewContract } from '@shopmind/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { UserEventType } from '@prisma/client';
import { QueueService } from '../../common/queue/queue.service';
import { toProductSummaryContract } from '../products/product.mapper';
import { AdminAnalyticsRepository } from './admin-analytics.repository';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    private readonly repository: AdminAnalyticsRepository,
    private readonly queues: QueueService,
  ) {}

  async overview(days: number): Promise<AdminAnalyticsOverviewContract> {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1_000);
    const [data, jobs] = await Promise.all([
      this.repository.read(from),
      this.readJobs(),
    ]);
    const successfulStatuses = new Set(['success', 'fallback']);
    const successes = data.aiGroups.reduce(
      (sum, group) =>
        sum + (successfulStatuses.has(group.status) ? group._count._all : 0),
      0,
    );
    const latencyIndex = Math.max(
      0,
      Math.ceil(data.aiLatencies.length * 0.95) - 1,
    );
    const products = new Map(
      data.topProducts.map((product) => [product.id, product]),
    );

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      catalog: {
        products: data.products,
        activeProducts: data.activeProducts,
        sourceMissingProducts: data.products - data.activeProducts,
        categories: data.categories,
        embeddingCoverage:
          data.products === 0 ? 0 : data.embeddings / data.products,
        staleEmbeddings: data.staleEmbeddings,
      },
      ai: {
        requests: data.aiAggregate._count._all,
        successes,
        failures: data.aiAggregate._count._all - successes,
        averageLatencyMs: data.aiAggregate._avg.latencyMs ?? 0,
        p95LatencyMs: data.aiLatencies[latencyIndex]?.latencyMs ?? 0,
        inputTokens: data.aiAggregate._sum.inputTokens ?? 0,
        outputTokens: data.aiAggregate._sum.outputTokens ?? 0,
      },
      events: {
        productViews: data.eventCounts.get(UserEventType.PRODUCT_VIEW) ?? 0,
        searchClicks:
          data.eventCounts.get(UserEventType.SEARCH_RESULT_CLICK) ?? 0,
        cartAdditions: data.eventCounts.get(UserEventType.ADD_TO_CART) ?? 0,
        topProducts: data.topGroups.flatMap((group) => {
          const product = products.get(group.productId);
          return product === undefined
            ? []
            : [
                {
                  product: toProductSummaryContract(product),
                  events: group._count._all,
                },
              ];
        }),
      },
      commerce: {
        orders: data.orderAggregate._count._all,
        orderValue: Number(data.orderAggregate._sum.total ?? 0),
      },
      jobs,
    };
  }

  private async readJobs(): Promise<AdminAnalyticsOverviewContract['jobs']> {
    try {
      return {
        available: true,
        ...(await this.queues.getOperationalSnapshot()),
      };
    } catch (error) {
      this.logger.warn({
        operation: 'admin_job_metrics',
        status: 'unavailable',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      return { available: false };
    }
  }
}
