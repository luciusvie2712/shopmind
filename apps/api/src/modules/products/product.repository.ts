import { Injectable } from '@nestjs/common';
import { Prisma, type Product } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from './catalog-state';
import { ProductSort } from './dto/list-products-query.dto';
import { type ProductListCriteria, toPagination } from './product-query';

export const productSummarySelection = {
  id: true,
  title: true,
  brand: true,
  price: true,
  rating: true,
  stock: true,
  thumbnail: true,
  category: { select: { id: true, slug: true, name: true } },
} as const satisfies Prisma.ProductSelect;

export type ProductSummaryRecord = Prisma.ProductGetPayload<{
  select: typeof productSummarySelection;
}>;

export type ProductDetailRecord = Prisma.ProductGetPayload<{
  include: {
    category: true;
    images: true;
    reviews: true;
  };
}>;

export interface ProductListResult {
  readonly products: readonly ProductSummaryRecord[];
  readonly total: number;
}

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(criteria: ProductListCriteria): Promise<ProductListResult> {
    const where = this.buildWhere(criteria);
    const pagination = toPagination(criteria);
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: productSummarySelection,
        orderBy: this.buildOrder(criteria.sort),
        ...pagination,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  findDetail(id: Product['id']): Promise<ProductDetailRecord | null> {
    return this.prisma.product.findFirst({
      where: { id, sourceStatus: SOURCE_STATUS.active },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: { orderBy: { reviewedAt: 'desc' } },
      },
    });
  }

  private buildWhere(criteria: ProductListCriteria): Prisma.ProductWhereInput {
    const price =
      criteria.minPrice === undefined && criteria.maxPrice === undefined
        ? undefined
        : {
            ...(criteria.minPrice === undefined
              ? {}
              : { gte: criteria.minPrice }),
            ...(criteria.maxPrice === undefined
              ? {}
              : { lte: criteria.maxPrice }),
          };

    return {
      sourceStatus: SOURCE_STATUS.active,
      ...(criteria.category === undefined
        ? {}
        : { category: { slug: criteria.category } }),
      ...(price === undefined ? {} : { price }),
      ...(criteria.brand === undefined
        ? {}
        : { brand: { equals: criteria.brand, mode: 'insensitive' } }),
      ...(criteria.minRating === undefined
        ? {}
        : { rating: { gte: criteria.minRating } }),
    };
  }

  private buildOrder(
    sort: ProductSort,
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return [{ price: 'asc' }, { id: 'asc' }];
      case ProductSort.PRICE_DESC:
        return [{ price: 'desc' }, { id: 'asc' }];
      case ProductSort.RATING_ASC:
        return [{ rating: 'asc' }, { id: 'asc' }];
      case ProductSort.RATING_DESC:
        return [{ rating: 'desc' }, { id: 'asc' }];
    }
  }
}
