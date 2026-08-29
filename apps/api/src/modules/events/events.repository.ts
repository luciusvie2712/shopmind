import { Injectable } from '@nestjs/common';
import { Prisma, UserEventType } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

export interface AppendUserEventInput {
  readonly id: string;
  readonly type: UserEventType;
  readonly userId?: string;
  readonly productId?: string;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly metadata: Prisma.InputJsonObject;
}

export interface ProductBehaviorSignal {
  readonly productId: string;
  readonly score: number;
}

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async productExists(productId: string): Promise<boolean> {
    return (
      (await this.prisma.product.count({ where: { id: productId } })) === 1
    );
  }

  async append(input: AppendUserEventInput): Promise<'recorded' | 'duplicate'> {
    try {
      await this.prisma.userEvent.create({ data: input });
      return 'recorded';
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 'duplicate';
      }
      throw error;
    }
  }

  async behaviorSignals(
    productIds: readonly string[],
    since: Date,
  ): Promise<readonly ProductBehaviorSignal[]> {
    if (productIds.length === 0) return [];
    const rows = await this.prisma.userEvent.groupBy({
      by: ['productId', 'type'],
      where: { productId: { in: [...productIds] }, createdAt: { gte: since } },
      _count: { _all: true },
    });
    const scores = new Map<string, number>();
    for (const row of rows) {
      if (row.productId === null) continue;
      const weight = EVENT_SIGNAL_WEIGHTS[row.type];
      scores.set(
        row.productId,
        (scores.get(row.productId) ?? 0) + row._count._all * weight,
      );
    }
    const max = Math.max(1, ...scores.values());
    return [...scores.entries()].map(([productId, score]) => ({
      productId,
      score: Math.min(score / max, 1),
    }));
  }
}

export const EVENT_SIGNAL_WEIGHTS: Readonly<Record<UserEventType, number>> = {
  PRODUCT_VIEW: 0.1,
  SEARCH_RESULT_CLICK: 0.35,
  ADD_TO_CART: 1,
  RECOMMENDATION_IMPRESSION: 0.05,
  RECOMMENDATION_CLICK: 0.5,
};
