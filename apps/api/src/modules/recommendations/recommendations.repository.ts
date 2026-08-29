import { Injectable } from '@nestjs/common';
import { Prisma, UserEventType } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import { productSummarySelection } from '../products/product.repository';

const recommendationSelection = {
  ...productSummarySelection,
  categoryId: true,
} as const satisfies Prisma.ProductSelect;

export type RecommendationProduct = Prisma.ProductGetPayload<{
  select: typeof recommendationSelection;
}>;

export interface UserRecommendationProfile {
  readonly categoryWeights: ReadonlyMap<string, number>;
  readonly brandWeights: ReadonlyMap<string, number>;
  readonly hasSignals: boolean;
}

@Injectable()
export class RecommendationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  candidates(input: {
    readonly category?: string;
    readonly maxPrice?: number;
  }) {
    return this.prisma.product.findMany({
      where: {
        sourceStatus: SOURCE_STATUS.active,
        stock: { gt: 0 },
        ...(input.category === undefined
          ? {}
          : { category: { slug: input.category } }),
        ...(input.maxPrice === undefined
          ? {}
          : { price: { lte: input.maxPrice } }),
      },
      orderBy: [{ rating: 'desc' }, { id: 'asc' }],
      take: 200,
      select: recommendationSelection,
    });
  }

  async profile(userId: string): Promise<UserRecommendationProfile> {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1_000);
    const [events, wishlist, cart, orderItems] = await Promise.all([
      this.prisma.userEvent.findMany({
        where: { userId, productId: { not: null }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          type: true,
          product: { select: { categoryId: true, brand: true } },
        },
      }),
      this.prisma.wishlistItem.findMany({
        where: { userId },
        take: 100,
        select: { product: { select: { categoryId: true, brand: true } } },
      }),
      this.prisma.cartItem.findMany({
        where: { cart: { userId } },
        take: 100,
        select: { product: { select: { categoryId: true, brand: true } } },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { userId } },
        orderBy: { order: { createdAt: 'desc' } },
        take: 100,
        select: { product: { select: { categoryId: true, brand: true } } },
      }),
    ]);
    const categoryWeights = new Map<string, number>();
    const brandWeights = new Map<string, number>();
    const add = (
      product: { categoryId: string; brand: string | null } | null,
      weight: number,
    ) => {
      if (product === null) return;
      categoryWeights.set(
        product.categoryId,
        (categoryWeights.get(product.categoryId) ?? 0) + weight,
      );
      if (product.brand)
        brandWeights.set(
          product.brand.toLowerCase(),
          (brandWeights.get(product.brand.toLowerCase()) ?? 0) + weight,
        );
    };
    const eventWeights: Readonly<Record<UserEventType, number>> = {
      PRODUCT_VIEW: 0.2,
      SEARCH_RESULT_CLICK: 0.5,
      ADD_TO_CART: 1,
      RECOMMENDATION_IMPRESSION: 0.05,
      RECOMMENDATION_CLICK: 0.5,
    };
    for (const event of events) add(event.product, eventWeights[event.type]);
    for (const item of wishlist) add(item.product, 0.8);
    for (const item of cart) add(item.product, 1);
    for (const item of orderItems) add(item.product, 1.2);
    return {
      categoryWeights,
      brandWeights,
      hasSignals: categoryWeights.size > 0 || brandWeights.size > 0,
    };
  }

  async popularity(
    productIds: readonly string[],
  ): Promise<ReadonlyMap<string, number>> {
    if (productIds.length === 0) return new Map();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);
    const groups = await this.prisma.userEvent.groupBy({
      by: ['productId'],
      where: { productId: { in: [...productIds] }, createdAt: { gte: since } },
      _count: { _all: true },
    });
    const max = Math.max(1, ...groups.map(({ _count }) => _count._all));
    return new Map(
      groups.flatMap((group) =>
        group.productId === null
          ? []
          : [[group.productId, group._count._all / max] as const],
      ),
    );
  }
}
