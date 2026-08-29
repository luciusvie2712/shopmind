import type {
  RecommendationProduct,
  UserRecommendationProfile,
} from './recommendations.repository';

export const RECOMMENDATION_RANKING_VERSION = 'personalized-v1' as const;

export function rankRecommendations(
  products: readonly RecommendationProduct[],
  profile: UserRecommendationProfile,
  popularity: ReadonlyMap<string, number>,
) {
  const maxCategory = Math.max(1, ...profile.categoryWeights.values());
  const maxBrand = Math.max(1, ...profile.brandWeights.values());
  return products
    .map((product) => {
      const categoryAffinity =
        (profile.categoryWeights.get(product.categoryId) ?? 0) / maxCategory;
      const brandAffinity = product.brand
        ? (profile.brandWeights.get(product.brand.toLowerCase()) ?? 0) /
          maxBrand
        : 0;
      const preference = Math.min(
        1,
        categoryAffinity * 0.7 + brandAffinity * 0.3,
      );
      const behavior = Math.min(1, popularity.get(product.id) ?? 0);
      const quality = Math.min(1, Number(product.rating) / 5);
      const score = profile.hasSignals
        ? 0.55 * preference + 0.15 * behavior + 0.3 * quality
        : 0.2 * behavior + 0.8 * quality;
      const reason = !profile.hasSignals
        ? 'cold_start'
        : preference > 0
          ? 'preference'
          : behavior > 0
            ? 'behavior'
            : 'popular';
      return {
        product,
        score: Math.min(1, Math.max(0, score)),
        reason,
      } as const;
    })
    .toSorted(
      (a, b) => b.score - a.score || a.product.id.localeCompare(b.product.id),
    );
}
