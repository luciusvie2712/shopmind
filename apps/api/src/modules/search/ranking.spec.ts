import { Prisma } from '@prisma/client';
import type { SearchCandidate } from './hybrid-search';
import {
  normalizeRating,
  normalizeUnitSignal,
  rankSearchCandidates,
  rankingScore,
  RANKING_WEIGHTS,
  stockSignal,
} from './ranking';

function candidate(
  id: string,
  values: Partial<{
    semanticSimilarity: number;
    keywordRelevance: number;
    preferenceMatch: number;
    rating: number;
    stock: number;
    price: number;
  }> = {},
): SearchCandidate {
  return {
    product: {
      id,
      title: id,
      brand: 'ShopMind',
      price: new Prisma.Decimal(values.price ?? 100),
      rating: new Prisma.Decimal(values.rating ?? 0),
      stock: values.stock ?? 0,
      thumbnail: null,
      category: { id: 'category', slug: 'laptops', name: 'Laptops' },
    },
    semanticSimilarity: values.semanticSimilarity ?? 0,
    keywordRelevance: values.keywordRelevance ?? 0,
    preferenceMatch: values.preferenceMatch ?? 0,
  };
}

describe('deterministic hybrid ranking', () => {
  it('maps all-zero and all-one signals to the score boundaries', () => {
    expect(
      rankingScore({
        semanticSimilarity: 0,
        keywordRelevance: 0,
        preferenceMatch: 0,
        normalizedRating: 0,
        stockSignal: 0,
      }),
    ).toBe(0);
    expect(
      rankingScore({
        semanticSimilarity: 1,
        keywordRelevance: 1,
        preferenceMatch: 1,
        normalizedRating: 1,
        stockSignal: 1,
      }),
    ).toBe(1);
  });

  it('uses the exact blueprint weights and a unit weight sum', () => {
    expect(RANKING_WEIGHTS).toEqual({
      semantic: 0.45,
      keyword: 0.2,
      preference: 0.15,
      rating: 0.1,
      stock: 0.1,
    });
    expect(
      Object.values(RANKING_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
    ).toBeCloseTo(1, 12);
    expect(
      rankingScore({
        semanticSimilarity: 1,
        keywordRelevance: 0,
        preferenceMatch: 0,
        normalizedRating: 0,
        stockSignal: 0,
      }),
    ).toBe(0.45);
    expect(
      rankingScore({
        semanticSimilarity: 0,
        keywordRelevance: 1,
        preferenceMatch: 0,
        normalizedRating: 0,
        stockSignal: 0,
      }),
    ).toBe(0.2);
    expect(
      rankingScore({
        semanticSimilarity: 0,
        keywordRelevance: 0,
        preferenceMatch: 1,
        normalizedRating: 0,
        stockSignal: 0,
      }),
    ).toBe(0.15);
    expect(
      rankingScore({
        semanticSimilarity: 0,
        keywordRelevance: 0,
        preferenceMatch: 0,
        normalizedRating: 1,
        stockSignal: 0,
      }),
    ).toBe(0.1);
    expect(
      rankingScore({
        semanticSimilarity: 0,
        keywordRelevance: 0,
        preferenceMatch: 0,
        normalizedRating: 0,
        stockSignal: 1,
      }),
    ).toBe(0.1);
  });

  it('normalizes all numeric signals safely to [0,1]', () => {
    expect(normalizeUnitSignal(-1)).toBe(0);
    expect(normalizeUnitSignal(0)).toBe(0);
    expect(normalizeUnitSignal(1)).toBe(1);
    expect(normalizeUnitSignal(2)).toBe(1);
    expect(normalizeUnitSignal(Number.NaN)).toBe(0);
    expect(normalizeUnitSignal(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeRating(0)).toBe(0);
    expect(normalizeRating(5)).toBe(1);
    expect(normalizeRating(7)).toBe(1);
    expect(stockSignal(0)).toBe(0);
    expect(stockSignal(1)).toBe(1);
  });

  it('keeps final scores in range and orders deterministically', () => {
    const ranked = rankSearchCandidates([
      candidate('b', {
        semanticSimilarity: 9,
        keywordRelevance: 9,
        preferenceMatch: 9,
        rating: 9,
        stock: 1,
      }),
      candidate('a', {
        semanticSimilarity: 1,
        keywordRelevance: 1,
        preferenceMatch: 1,
        rating: 5,
        stock: 1,
      }),
    ]);
    expect(ranked.map(({ product }) => product.id)).toEqual(['a', 'b']);
    expect(ranked.every(({ score }) => score >= 0 && score <= 1)).toBe(true);
  });

  it('does not use price as a hidden ranking signal', () => {
    const ranked = rankSearchCandidates([
      candidate('z-cheap', {
        price: 10,
        semanticSimilarity: 0.5,
        rating: 4,
        stock: 1,
      }),
      candidate('a-expensive', {
        price: 1_000,
        semanticSimilarity: 0.5,
        rating: 4,
        stock: 1,
      }),
    ]);
    expect(ranked[0].product.id).toBe('a-expensive');
    expect(ranked[0].score).toBe(ranked[1].score);
  });
});
