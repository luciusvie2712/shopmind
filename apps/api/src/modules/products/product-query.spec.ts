import {
  ListProductsQueryDto,
  ProductSort,
} from './dto/list-products-query.dto';
import { toPagination, toProductListCriteria } from './product-query';

describe('product query translation', () => {
  it('translates external pagination and normalizes filters', () => {
    const query = Object.assign(new ListProductsQueryDto(), {
      page: 3,
      pageSize: 10,
      category: 'Smart Phones',
      brand: ' Acme ',
      sort: ProductSort.PRICE_ASC,
    });
    const criteria = toProductListCriteria(query);

    expect(criteria).toMatchObject({
      category: 'smart-phones',
      brand: 'Acme',
      sort: ProductSort.PRICE_ASC,
    });
    expect(toPagination(criteria)).toEqual({ skip: 20, take: 10 });
  });

  it('rejects an inverted price range', () => {
    const query = Object.assign(new ListProductsQueryDto(), {
      minPrice: 20,
      maxPrice: 10,
    });
    expect(() => toProductListCriteria(query)).toThrow(
      'minPrice must not exceed maxPrice',
    );
  });

  it.each([
    [{ minPrice: 0 }, { minPrice: 0 }],
    [{ maxPrice: 0 }, { maxPrice: 0 }],
    [
      { minPrice: 10, maxPrice: 10 },
      { minPrice: 10, maxPrice: 10 },
    ],
  ] as const)('preserves inclusive price boundary %o', (input, expected) => {
    expect(
      toProductListCriteria(
        Object.assign(new ListProductsQueryDto(), {
          page: 1,
          pageSize: 20,
          sort: ProductSort.RATING_DESC,
          ...input,
        }),
      ),
    ).toMatchObject(expected);
  });
});
