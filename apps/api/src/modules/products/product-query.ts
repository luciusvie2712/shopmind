import { BadRequestException } from '@nestjs/common';
import { toSlug } from '../../common/text/slug';
import {
  type ListProductsQueryDto,
  ProductSort,
} from './dto/list-products-query.dto';

export interface ProductListCriteria {
  readonly page: number;
  readonly pageSize: number;
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly brand?: string;
  readonly minRating?: number;
  readonly sort: ProductSort;
}

export function toProductListCriteria(
  query: ListProductsQueryDto,
): ProductListCriteria {
  if (
    query.minPrice !== undefined &&
    query.maxPrice !== undefined &&
    query.minPrice > query.maxPrice
  ) {
    throw new BadRequestException('minPrice must not exceed maxPrice');
  }
  const category =
    query.category === undefined ? undefined : toSlug(query.category);
  if (category === '') {
    throw new BadRequestException('category must contain letters or numbers');
  }
  const brand = query.brand?.trim();
  if (brand === '') {
    throw new BadRequestException('brand must not be empty');
  }

  return {
    page: query.page,
    pageSize: query.pageSize,
    ...(category === undefined ? {} : { category }),
    ...(query.minPrice === undefined ? {} : { minPrice: query.minPrice }),
    ...(query.maxPrice === undefined ? {} : { maxPrice: query.maxPrice }),
    ...(brand === undefined ? {} : { brand }),
    ...(query.minRating === undefined ? {} : { minRating: query.minRating }),
    sort: query.sort,
  };
}

export function toPagination(criteria: ProductListCriteria): {
  readonly skip: number;
  readonly take: number;
} {
  return {
    skip: (criteria.page - 1) * criteria.pageSize,
    take: criteria.pageSize,
  };
}
