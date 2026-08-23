import { Injectable } from '@nestjs/common';
import {
  buildProductListCacheKey,
  CATALOG_CACHE_KEYS,
  CATALOG_CACHE_TTL_SECONDS,
  CatalogCacheService,
} from '../../common/cache/catalog-cache.service';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { type ListProductsQueryDto } from './dto/list-products-query.dto';
import {
  type ProductDetailContract,
  productDetailContractSchema,
  type ProductListContract,
  productListContractSchema,
} from './product.contract';
import { ProductRepository } from './product.repository';
import {
  toProductDetailContract,
  toProductSummaryContract,
} from './product.mapper';
import { toProductListCriteria } from './product-query';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  async list(query: ListProductsQueryDto): Promise<ProductListContract> {
    const criteria = toProductListCriteria(query);
    const cacheKey = buildProductListCacheKey({ ...criteria });
    const cached = await this.catalogCache.get(
      cacheKey,
      productListContractSchema,
    );
    if (cached !== null) {
      return cached;
    }

    const result = await this.productRepository.list(criteria);
    const response: ProductListContract = {
      items: result.products.map(toProductSummaryContract),
      page: criteria.page,
      pageSize: criteria.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / criteria.pageSize),
    };
    await this.catalogCache.set(
      cacheKey,
      response,
      CATALOG_CACHE_TTL_SECONDS.productList,
    );
    return response;
  }

  async detail(id: string): Promise<ProductDetailContract> {
    const cacheKey = CATALOG_CACHE_KEYS.product(id);
    const cached = await this.catalogCache.get(
      cacheKey,
      productDetailContractSchema,
    );
    if (cached !== null) {
      return cached;
    }

    const product = await this.productRepository.findDetail(id);
    if (product === null) {
      throw new ApiException(
        ERROR_CODES.PRODUCT_NOT_FOUND,
        'Product was not found',
      );
    }

    const response: ProductDetailContract = toProductDetailContract(product);
    await this.catalogCache.set(
      cacheKey,
      response,
      CATALOG_CACHE_TTL_SECONDS.product,
    );
    return response;
  }
}
