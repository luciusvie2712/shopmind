import { buildProductListCacheKey } from './catalog-cache.service';

describe('catalog cache keys', () => {
  it('uses a canonical query representation', () => {
    expect(
      buildProductListCacheKey({ page: 1, category: 'laptops', pageSize: 20 }),
    ).toBe(
      buildProductListCacheKey({ pageSize: 20, page: 1, category: 'laptops' }),
    );
    expect(buildProductListCacheKey({ page: 2 })).not.toBe(
      buildProductListCacheKey({ page: 1 }),
    );
  });
});
