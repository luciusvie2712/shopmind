import { ProductSort } from '../products/dto/list-products-query.dto';
import { SearchProductsQueryDto } from './dto/search-products-query.dto';
import { toProductSearchCriteria } from './search-query';

function query(
  values: Partial<SearchProductsQueryDto>,
): SearchProductsQueryDto {
  return Object.assign(new SearchProductsQueryDto(), values);
}

describe('toProductSearchCriteria', () => {
  it('normalizes keyword and catalog filters', () => {
    expect(
      toProductSearchCriteria(
        query({
          q: '  portable   laptop  ',
          category: 'Laptops',
          minPrice: 500,
          maxPrice: 1_500,
          page: 2,
          pageSize: 12,
          sort: ProductSort.PRICE_ASC,
        }),
      ),
    ).toEqual({
      query: 'portable laptop',
      category: 'laptops',
      minPrice: 500,
      maxPrice: 1_500,
      page: 2,
      pageSize: 12,
      sort: ProductSort.PRICE_ASC,
    });
  });

  it('rejects a keyword that is empty after normalization', () => {
    expect(() => toProductSearchCriteria(query({ q: '   ' }))).toThrow(
      'q must contain at least 2 characters',
    );
  });
});
