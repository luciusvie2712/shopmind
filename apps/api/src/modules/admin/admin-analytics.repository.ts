import { Injectable } from '@nestjs/common';
import { UserEventType } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { productSummarySelection } from '../products/product.repository';

interface CountRow {
  readonly count: bigint;
}

@Injectable()
export class AdminAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(from: Date) {
    const [
      products,
      activeProducts,
      categories,
      embeddings,
      staleRows,
      eventGroups,
      productEventGroups,
      aiGroups,
      aiAggregate,
      aiLatencies,
      orderAggregate,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { sourceStatus: 'ACTIVE' } }),
      this.prisma.category.count(),
      this.prisma.productEmbedding.count(),
      this.prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint AS count
        FROM products p
        LEFT JOIN product_embeddings e ON e.product_id = p.id
        WHERE e.product_id IS NULL OR e.content_hash <> p.content_hash
      `,
      this.prisma.userEvent.groupBy({
        by: ['type'],
        where: { createdAt: { gte: from } },
        _count: { _all: true },
      }),
      this.prisma.userEvent.groupBy({
        by: ['productId'],
        where: { createdAt: { gte: from }, productId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.aiRequestLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: from } },
        _count: { _all: true },
      }),
      this.prisma.aiRequestLog.aggregate({
        where: { createdAt: { gte: from } },
        _count: { _all: true },
        _avg: { latencyMs: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiRequestLog.findMany({
        where: { createdAt: { gte: from } },
        orderBy: { latencyMs: 'asc' },
        take: 10_000,
        select: { latencyMs: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: from } },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const topGroups = productEventGroups
      .filter(
        (group): group is typeof group & { productId: string } =>
          group.productId !== null,
      )
      .toSorted((a, b) => b._count._all - a._count._all)
      .slice(0, 10);
    const topProducts = await this.prisma.product.findMany({
      where: { id: { in: topGroups.map(({ productId }) => productId) } },
      select: productSummarySelection,
    });

    return {
      products,
      activeProducts,
      categories,
      embeddings,
      staleEmbeddings: Number(staleRows[0]?.count ?? 0n),
      eventCounts: new Map(
        eventGroups.map(({ type, _count }) => [type, _count._all]),
      ) as ReadonlyMap<UserEventType, number>,
      topGroups,
      topProducts,
      aiGroups,
      aiAggregate,
      aiLatencies,
      orderAggregate,
    };
  }
}
