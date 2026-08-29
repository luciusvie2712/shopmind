import { Injectable } from '@nestjs/common';
import { DummyJsonClient } from './dummy-json.client';
import { parseDummyJsonProductsPayload } from './dummy-json.schema';
import {
  DUMMYJSON_SOURCE,
  normalizeDummyJsonProduct,
} from './product-normalizer';
import type {
  ProductSourcePage,
  ProductSourceProvider,
} from './product-source.provider';

@Injectable()
export class DummyJsonSourceProvider implements ProductSourceProvider {
  constructor(private readonly client: DummyJsonClient) {}
  async fetchPage(cursor?: string): Promise<ProductSourcePage> {
    if (cursor !== undefined)
      return { source: DUMMYJSON_SOURCE, products: [], complete: true };
    const payload = parseDummyJsonProductsPayload(
      await this.client.fetchProducts(),
    );
    return {
      source: DUMMYJSON_SOURCE,
      products: payload.products.map(normalizeDummyJsonProduct),
      complete: true,
    };
  }
}
