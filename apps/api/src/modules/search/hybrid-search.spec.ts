import { Prisma } from '@prisma/client';
import {
  boundHybridCandidates,
  boundedHybridLimit,
  mergeSearchCandidates,
  satisfiesHardConstraints,
  type SearchCandidate,
} from './hybrid-search';

function candidate(
  id: string,
  values: Partial<{
    category: string;
    brand: string | null;
    price: number;
    rating: number;
    stock: number;
    semanticSimilarity: number;
  }> = {},
): SearchCandidate {
  return {
    product: {
      id,
      title: id,
      brand: values.brand ?? 'ShopMind',
      price: new Prisma.Decimal(values.price ?? 900),
      rating: new Prisma.Decimal(values.rating ?? 4.5),
      stock: values.stock ?? 5,
      thumbnail: null,
      category: {
        id: 'category',
        slug: values.category ?? 'laptops',
        name: 'Category',
      },
    },
    semanticSimilarity: values.semanticSimilarity ?? 0,
    keywordRelevance: 0,
    preferenceMatch: 0,
  };
}

describe('hybrid candidate generation', () => {
  it('unions keyword-only and semantic-only candidates and merges duplicates', () => {
    const keywordOnly = candidate('keyword-only');
    const both = candidate('both');
    const semanticOnly = candidate('semantic-only');
    const merged = mergeSearchCandidates(
      [
        { product: keywordOnly.product, keywordRelevance: 0.8 },
        { product: both.product, keywordRelevance: 0.7 },
      ],
      [
        { product: both.product, semanticSimilarity: 0.9 },
        { product: semanticOnly.product, semanticSimilarity: 0.6 },
      ],
    );

    expect(merged).toHaveLength(3);
    expect(
      merged.find(({ product }) => product.id === 'keyword-only'),
    ).toMatchObject({ keywordRelevance: 0.8, semanticSimilarity: 0 });
    expect(
      merged.find(({ product }) => product.id === 'semantic-only'),
    ).toMatchObject({ keywordRelevance: 0, semanticSimilarity: 0.6 });
    expect(merged.find(({ product }) => product.id === 'both')).toMatchObject({
      keywordRelevance: 0.7,
      semanticSimilarity: 0.9,
      preferenceMatch: 0,
    });
  });

  it.each([
    ['over budget', candidate('budget', { price: 1_300 }), { maxPrice: 1_000 }],
    [
      'wrong category',
      candidate('category', { category: 'phones' }),
      { category: 'laptops' },
    ],
    [
      'wrong brand',
      candidate('brand', { brand: 'Other' }),
      { brand: 'Required' },
    ],
    ['below rating', candidate('rating', { rating: 3 }), { minRating: 4 }],
    ['out of stock', candidate('stock', { stock: 0 }), { inStockOnly: true }],
  ] as const)('excludes %s before scoring', (_name, item, filters) => {
    expect(item.semanticSimilarity).toBeGreaterThanOrEqual(0);
    expect(satisfiesHardConstraints(item, filters)).toBe(false);
  });

  it('rejects every hard-constraint violation even at maximum semantic score', () => {
    const highlyRelevant = candidate('semantic-winner', {
      category: 'phones',
      brand: 'Other',
      price: 2_000,
      rating: 2,
      stock: 0,
      semanticSimilarity: 1,
    });

    expect(
      satisfiesHardConstraints(highlyRelevant, {
        category: 'laptops',
        maxPrice: 1_000,
        brands: ['Required'],
        minRating: 4,
        inStockOnly: true,
      }),
    ).toBe(false);
  });

  it('enforces the final server cap', () => {
    const candidates = Array.from({ length: 100 }, (_, index) => index);
    expect(boundedHybridLimit(5_000)).toBe(20);
    expect(boundHybridCandidates(candidates, 5_000)).toHaveLength(20);
    expect(boundHybridCandidates(candidates, 12)).toHaveLength(12);
  });
});
