import type { ComparisonProductContract } from '@shopmind/contracts';
import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { comparisonProduct } from './tools/canonical-product.projection';

@Injectable()
export class ProductComparisonFactsService {
  constructor(private readonly productsService: ProductsService) {}

  async getFacts(
    productIds: readonly string[],
  ): Promise<readonly ComparisonProductContract[]> {
    const products = await Promise.all(
      productIds.map((productId) => this.productsService.detail(productId)),
    );
    return products.map(comparisonProduct);
  }
}
