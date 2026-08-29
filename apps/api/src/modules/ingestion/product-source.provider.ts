import type { NormalizedProduct } from './product-normalizer';

export const PRODUCT_SOURCE_PROVIDER = Symbol('PRODUCT_SOURCE_PROVIDER');

export interface ProductSourcePage {
  readonly products: readonly NormalizedProduct[];
  readonly source: string;
  readonly cursor?: string;
  readonly complete: boolean;
}

export interface ProductSourceProvider {
  fetchPage(cursor?: string): Promise<ProductSourcePage>;
}
