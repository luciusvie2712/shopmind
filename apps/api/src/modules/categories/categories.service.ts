import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  CATALOG_CACHE_KEYS,
  CATALOG_CACHE_TTL_SECONDS,
  CatalogCacheService,
} from '../../common/cache/catalog-cache.service';
import {
  type CategoryContract,
  categoryContractSchema,
} from '../products/product.contract';
import { CategoryRepository } from './category.repository';

const categoriesContractSchema = z.array(categoryContractSchema);

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  async list(): Promise<CategoryContract[]> {
    const cached = await this.catalogCache.get(
      CATALOG_CACHE_KEYS.categories,
      categoriesContractSchema,
    );
    if (cached !== null) {
      return cached;
    }

    const categories = await this.categoryRepository.list();
    await this.catalogCache.set(
      CATALOG_CACHE_KEYS.categories,
      categories,
      CATALOG_CACHE_TTL_SECONDS.categories,
    );
    return categories;
  }
}
