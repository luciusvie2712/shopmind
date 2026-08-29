import { Prisma } from '@prisma/client';
import {
  rankRecommendations,
  RECOMMENDATION_RANKING_VERSION,
} from './recommendation-ranking';
import type {
  RecommendationProduct,
  UserRecommendationProfile,
} from './recommendations.repository';

function product(
  id: string,
  categoryId: string,
  rating = 4,
): RecommendationProduct {
  return {
    id,
    categoryId,
    title: id,
    brand: 'ShopMind',
    price: new Prisma.Decimal(100),
    rating: new Prisma.Decimal(rating),
    stock: 5,
    thumbnail: null,
    category: { id: categoryId, slug: categoryId, name: categoryId },
  };
}

describe('personalized recommendation ranking', () => {
  it('is deterministic and favors the authenticated user profile', () => {
    const profile: UserRecommendationProfile = {
      categoryWeights: new Map([['laptops', 3]]),
      brandWeights: new Map(),
      hasSignals: true,
    };
    const ranked = rankRecommendations(
      [product('phone', 'phones', 5), product('laptop', 'laptops', 4)],
      profile,
      new Map(),
    );
    expect(ranked[0].product.id).toBe('laptop');
    expect(RECOMMENDATION_RANKING_VERSION).toBe('personalized-v1');
    expect(
      rankRecommendations(
        ranked.map(({ product }) => product),
        profile,
        new Map(),
      ).map(({ product }) => product.id),
    ).toEqual(['laptop', 'phone']);
  });

  it('uses a stable quality fallback for a cold-start user', () => {
    const profile: UserRecommendationProfile = {
      categoryWeights: new Map(),
      brandWeights: new Map(),
      hasSignals: false,
    };
    const ranked = rankRecommendations(
      [product('lower', 'x', 3), product('higher', 'y', 5)],
      profile,
      new Map(),
    );
    expect(ranked.map(({ product }) => product.id)).toEqual([
      'higher',
      'lower',
    ]);
    expect(ranked.every(({ reason }) => reason === 'cold_start')).toBe(true);
  });
});
