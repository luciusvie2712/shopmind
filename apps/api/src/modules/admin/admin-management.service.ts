import type {
  AdminAiLogListContract,
  AdminIngestionStatusContract,
  AdminOrderListContract,
  AdminPaymentListContract,
  AdminProductListContract,
  AdminUserListContract,
} from '@shopmind/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../../common/queue/queue.service';
import { AdminManagementRepository } from './admin-management.repository';
import { AdminListQueryDto } from './dto/admin-list-query.dto';

@Injectable()
export class AdminManagementService {
  private readonly logger = new Logger(AdminManagementService.name);

  constructor(
    private readonly repository: AdminManagementRepository,
    private readonly queues: QueueService,
  ) {}

  async users(query: AdminListQueryDto): Promise<AdminUserListContract> {
    const data = await this.repository.users(query);
    return {
      ...this.pagination(query, data.total),
      items: data.items.map(({ _count, ...user }) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        orderCount: _count.orders,
        eventCount: _count.events,
      })),
      summary: { users: data.users, admins: data.admins },
    };
  }

  async orders(query: AdminListQueryDto): Promise<AdminOrderListContract> {
    const data = await this.repository.orders(query);
    return {
      ...this.pagination(query, data.total),
      items: data.items.map((order) => ({
        id: order.id,
        status: order.status,
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        itemCount: order._count.items,
        customer: order.user,
        paymentStatus: order.payment?.status ?? null,
      })),
      summary: {
        orders: data.aggregate._count._all,
        orderValue: Number(data.aggregate._sum.total ?? 0),
      },
    };
  }

  async payments(query: AdminListQueryDto): Promise<AdminPaymentListContract> {
    const data = await this.repository.payments(query);
    return {
      ...this.pagination(query, data.total),
      items: data.items.map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        provider: payment.provider,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        customer: payment.user,
      })),
      summary: {
        payments: data.payments,
        succeeded: data.succeeded,
        failed: data.failed,
        succeededValue: Number(data.succeededValue._sum.amount ?? 0),
      },
    };
  }

  async products(query: AdminListQueryDto): Promise<AdminProductListContract> {
    const data = await this.repository.products(query);
    return {
      ...this.pagination(query, data.total),
      items: data.items.map((product) => ({
        id: product.id,
        title: product.title,
        source: product.source,
        externalId: product.externalId,
        sourceStatus: product.sourceStatus,
        brand: product.brand,
        thumbnail: product.thumbnail,
        category: product.category.name,
        price: Number(product.price),
        rating: Number(product.rating),
        stock: product.stock,
        hasEmbedding: product.embedding !== null,
        reviewSummaryStatus: product.reviewSummary?.status ?? null,
        updatedAt: product.updatedAt.toISOString(),
      })),
      summary: {
        products: data.products,
        active: data.active,
        outOfStock: data.outOfStock,
        embedded: data.embedded,
      },
    };
  }

  async aiLogs(query: AdminListQueryDto): Promise<AdminAiLogListContract> {
    const data = await this.repository.aiLogs(query);
    return {
      ...this.pagination(query, data.total),
      items: data.items.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      summary: {
        requests: data.aggregate._count._all,
        failures: data.failures,
        averageLatencyMs: data.aggregate._avg.latencyMs ?? 0,
        totalTokens:
          (data.aggregate._sum.inputTokens ?? 0) +
          (data.aggregate._sum.outputTokens ?? 0),
      },
    };
  }

  async ingestionStatus(): Promise<AdminIngestionStatusContract> {
    const [data, jobs] = await Promise.all([
      this.repository.ingestionStatus(),
      this.readJobs(),
    ]);
    return {
      catalog: {
        products: data.products,
        active: data.active,
        sourceMissing: data.products - data.active,
        embedded: data.embedded,
        lastProductUpdatedAt: data.latest._max.updatedAt?.toISOString() ?? null,
        sources: data.sources.map((source) => ({
          source: source.source,
          products: source._count._all,
        })),
        reviewSummaries: data.reviewSummaries.map((summary) => ({
          status: summary.status,
          products: summary._count._all,
        })),
      },
      jobs,
    };
  }

  private pagination(query: AdminListQueryDto, total: number) {
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  private async readJobs(): Promise<AdminIngestionStatusContract['jobs']> {
    try {
      return {
        available: true,
        ...(await this.queues.getOperationalSnapshot()),
      };
    } catch (error) {
      this.logger.warn({
        operation: 'admin_ingestion_status',
        status: 'queue_unavailable',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      return { available: false };
    }
  }
}
