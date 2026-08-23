import { BadRequestException } from '@nestjs/common';
import {
  type ProductListCriteria,
  toProductListCriteria,
} from '../products/product-query';
import type { SearchProductsQueryDto } from './dto/search-products-query.dto';

export interface ProductSearchCriteria extends ProductListCriteria {
  readonly query: string;
}

export function toProductSearchCriteria(
  input: SearchProductsQueryDto,
): ProductSearchCriteria {
  const query = input.q.trim().replace(/\s+/g, ' ');
  if (query.length < 2) {
    throw new BadRequestException('q must contain at least 2 characters');
  }
  return { ...toProductListCriteria(input), query };
}
