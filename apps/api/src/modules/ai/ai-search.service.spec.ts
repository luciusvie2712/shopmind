import { Prisma } from '@prisma/client';
import {
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
} from './provider/ai-provider';
import { AiSearchService } from './ai-search.service';
import type { SearchService } from '../search/search.service';
import type { RankedSearchCandidate } from '../search/ranking';

const productId = '00000000-0000-4000-8000-000000000001';
const intent = {
  category: 'laptops',
  price: { max: 1_000 },
  brands: ['Required Brand'],
  minRating: 4,
  useCases: ['backend development'],
  requiredFeatures: ['Docker'],
  priorities: ['portability'],
  negativePreferences: ['gaming-first'],
  semanticQuery: 'portable Docker development laptop',
};

function rankedCandidate(): RankedSearchCandidate {
  return {
    product: {
      id: productId,
      title: 'Canonical Title',
      description: 'Canonical Docker laptop',
      brand: 'Required Brand',
      price: new Prisma.Decimal(999),
      rating: new Prisma.Decimal(4.8),
      stock: 5,
      thumbnail: null,
      category: { id: 'category', slug: 'laptops', name: 'Laptops' },
    },
    semanticSimilarity: 1,
    keywordRelevance: 1,
    preferenceMatch: 1,
    normalizedRating: 0.96,
    stockSignal: 1,
    score: 0.946,
  };
}

describe('AiSearchService', () => {
  const extractSearchIntent = jest.fn();
  const generateGroundedRecommendation = jest.fn();
  const searchHybrid = jest.fn();
  const searchFallback = jest.fn();
  const searchKeywordOnly = jest.fn();
  const service = new AiSearchService(
    {
      extractSearchIntent,
      generateGroundedRecommendation,
    },
    {
      searchHybrid,
      searchFallback,
      searchKeywordOnly,
    } as unknown as SearchService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    extractSearchIntent.mockResolvedValue(intent);
    searchHybrid.mockResolvedValue([rankedCandidate()]);
    searchFallback.mockResolvedValue([rankedCandidate()]);
    searchKeywordOnly.mockResolvedValue([rankedCandidate()]);
    generateGroundedRecommendation.mockResolvedValue({
      recommendations: [
        { productId, reason: 'Grounded reason', tradeoffs: ['Tradeoff'] },
      ],
    });
  });

  it('passes hard constraints to SearchModule and remaps canonical facts', async () => {
    const response = await service.search(
      { query: 'development laptop', limit: 10 },
      'request-1',
    );
    expect(searchHybrid).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'laptops',
        maxPrice: 1_000,
        brands: ['Required Brand'],
        minRating: 4,
        requiredFeatures: ['Docker'],
        inStockOnly: true,
      }),
    );
    expect(response.results[0]).toMatchObject({
      product: {
        id: productId,
        title: 'Canonical Title',
        price: 999,
        rating: 4.8,
        stock: 5,
      },
      reason: 'Grounded reason',
    });
  });

  it('never lets an outside candidate ID reach the response', async () => {
    generateGroundedRecommendation.mockResolvedValue({
      recommendations: [
        {
          productId: '00000000-0000-4000-8000-000000000099',
          reason: 'Invented product',
          tradeoffs: [],
          price: 1,
        },
      ],
    });
    const response = await service.search(
      { query: 'development laptop', limit: 10 },
      'request-2',
    );
    expect(response).toMatchObject({
      status: 'fallback',
      fallback: { stage: 'recommendation', reason: 'AI_INVALID_OUTPUT' },
    });
    expect(response.results.map(({ product }) => product.id)).toEqual([
      productId,
    ]);
    expect(JSON.stringify(response)).not.toContain('000000000099');
    expect(response.results[0].product.price).toBe(999);
    expect(response.results[0].reason).toBeUndefined();
  });

  it.each([
    [new AiProviderInvalidOutputError(), 'AI_INVALID_OUTPUT'],
    [new AiProviderTimeoutError(), 'AI_PROVIDER_TIMEOUT'],
  ] as const)(
    'falls back when intent extraction fails',
    async (error, reason) => {
      extractSearchIntent.mockRejectedValue(error);
      const response = await service.search(
        { query: 'development laptop', limit: 10 },
        'request-3',
      );
      expect(searchFallback).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'development laptop' }),
      );
      expect(generateGroundedRecommendation).not.toHaveBeenCalled();
      expect(response).toMatchObject({
        status: 'fallback',
        fallback: { stage: 'intent', reason },
      });
      expect(response.results[0].reason).toBeUndefined();
    },
  );

  it('returns deterministic candidates when explanation fails', async () => {
    generateGroundedRecommendation.mockRejectedValue(
      new AiProviderInvalidOutputError(),
    );
    const response = await service.search(
      { query: 'development laptop', limit: 10 },
      'request-4',
    );
    expect(response).toMatchObject({
      status: 'fallback',
      fallback: { stage: 'recommendation', reason: 'AI_INVALID_OUTPUT' },
    });
    expect(response.results[0].reason).toBeUndefined();
  });

  it('returns explicit no-hard-match without explanation call', async () => {
    searchHybrid.mockResolvedValue([]);
    const response = await service.search(
      { query: 'impossible requirements', limit: 10 },
      'request-5',
    );
    expect(response.status).toBe('no_hard_match');
    expect(response.results).toEqual([]);
    expect(generateGroundedRecommendation).not.toHaveBeenCalled();
  });
});
