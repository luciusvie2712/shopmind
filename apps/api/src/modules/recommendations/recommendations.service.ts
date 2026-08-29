import type { RecommendationsContract } from '@shopmind/contracts';
import { Injectable } from '@nestjs/common';
import { toProductSummaryContract } from '../products/product.mapper';
import type { ListRecommendationsDto } from './dto/list-recommendations.dto';
import {
  rankRecommendations,
  RECOMMENDATION_RANKING_VERSION,
} from './recommendation-ranking';
import { RecommendationsRepository } from './recommendations.repository';

@Injectable()
export class RecommendationsService {
  constructor(private readonly repository: RecommendationsRepository) {}

  async list(
    userId: string,
    input: ListRecommendationsDto,
  ): Promise<RecommendationsContract> {
    const [products, profile] = await Promise.all([
      this.repository.candidates({
        category: input.category,
        maxPrice: input.maxPrice,
      }),
      this.repository.profile(userId),
    ]);
    const popularity = await this.repository.popularity(
      products.map(({ id }) => id),
    );
    const ranked = rankRecommendations(products, profile, popularity).slice(
      0,
      input.limit,
    );
    return {
      items: ranked.map(({ product, score, reason }) => ({
        product: toProductSummaryContract(product),
        score,
        reason,
        rankingVersion: RECOMMENDATION_RANKING_VERSION,
      })),
      personalized: profile.hasSignals,
      rankingVersion: RECOMMENDATION_RANKING_VERSION,
    };
  }
}
