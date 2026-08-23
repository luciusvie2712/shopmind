import type {
  AiSearchContract,
  AiSearchFallbackReason,
  AiSearchResultContract,
} from '@shopmind/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { toProductSummaryContract } from '../products/product.mapper';
import type { RankedSearchCandidate } from '../search/ranking';
import { SearchService } from '../search/search.service';
import type { AiSearchDto } from './dto/ai-search.dto';
import {
  AI_SEARCH_PROVIDER,
  type AiSearchProvider,
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './provider/ai-provider';
import type { SearchIntent } from './search-intent.schema';

@Injectable()
export class AiSearchService {
  constructor(
    @Inject(AI_SEARCH_PROVIDER)
    private readonly aiProvider: AiSearchProvider,
    private readonly searchService: SearchService,
  ) {}

  async search(
    input: AiSearchDto,
    requestId: string,
  ): Promise<AiSearchContract> {
    let intent: SearchIntent;
    try {
      intent = await this.aiProvider.extractSearchIntent({
        query: input.query,
      });
    } catch (error) {
      const reason = this.providerFailureReason(error);
      if (reason === undefined) throw error;
      return this.intentFallback(input, requestId, reason);
    }

    const searchInput = {
      query: intent.semanticQuery,
      semanticQuery: intent.semanticQuery,
      limit: input.limit,
      category: intent.category,
      minPrice: intent.price?.min,
      maxPrice: intent.price?.max,
      brands: intent.brands,
      minRating: intent.minRating,
      requiredFeatures: intent.requiredFeatures,
      preferenceTerms: [
        ...intent.useCases,
        ...intent.requiredFeatures,
        ...intent.priorities,
      ],
      negativePreferences: intent.negativePreferences,
      inStockOnly: true,
    } as const;
    let candidates: readonly RankedSearchCandidate[];
    try {
      candidates = await this.searchService.searchHybrid(searchInput);
    } catch (error) {
      if (
        !(error instanceof ApiException) ||
        (error.code !== ERROR_CODES.AI_PROVIDER_TIMEOUT &&
          error.code !== ERROR_CODES.AI_INVALID_OUTPUT)
      ) {
        throw error;
      }
      candidates = await this.searchService.searchKeywordOnly(searchInput);
      return {
        intent,
        results: candidates.map((candidate) => this.toResult(candidate)),
        status: 'fallback',
        fallback: {
          stage: 'retrieval',
          reason: error.code,
        },
        requestId,
      };
    }

    if (candidates.length === 0) {
      return {
        intent,
        results: [],
        status: 'no_hard_match',
        requestId,
      };
    }

    try {
      const recommendation =
        await this.aiProvider.generateGroundedRecommendation({
          intent,
          candidates: candidates.map((candidate) => ({
            id: candidate.product.id,
            title: candidate.product.title,
            brand: candidate.product.brand,
            category: candidate.product.category.name,
            price: Number(candidate.product.price),
            rating: Number(candidate.product.rating),
            stock: candidate.product.stock,
            score: candidate.score,
          })),
          limit: input.limit,
        });
      const candidateMap = new Map(
        candidates.map((candidate) => [candidate.product.id, candidate]),
      );
      const results = recommendation.recommendations.map((item) => {
        const candidate = candidateMap.get(item.productId);
        if (candidate === undefined) {
          throw new AiProviderInvalidOutputError(
            'Model referenced a product outside the candidate set',
          );
        }
        return this.toResult(candidate, item.reason, item.tradeoffs);
      });
      return { intent, results, status: 'success', requestId };
    } catch (error) {
      const reason = this.providerFailureReason(error);
      if (reason === undefined) throw error;
      return {
        intent,
        results: candidates.map((candidate) => this.toResult(candidate)),
        status: 'fallback',
        fallback: { stage: 'recommendation', reason },
        requestId,
      };
    }
  }

  private async intentFallback(
    input: AiSearchDto,
    requestId: string,
    reason: AiSearchFallbackReason,
  ): Promise<AiSearchContract> {
    const intent = this.fallbackIntent(input.query);
    const candidates = await this.searchService.searchFallback({
      query: input.query,
      semanticQuery: input.query,
      limit: input.limit,
      inStockOnly: true,
    });
    return {
      intent,
      results: candidates.map((candidate) => this.toResult(candidate)),
      status: 'fallback',
      fallback: { stage: 'intent', reason },
      requestId,
    };
  }

  private fallbackIntent(query: string): SearchIntent {
    return {
      useCases: [],
      requiredFeatures: [],
      priorities: [],
      negativePreferences: [],
      semanticQuery: query.trim().replace(/\s+/g, ' '),
    };
  }

  private toResult(
    candidate: RankedSearchCandidate,
    reason?: string,
    tradeoffs: readonly string[] = [],
  ): AiSearchResultContract {
    return {
      product: toProductSummaryContract(candidate.product),
      score: candidate.score,
      ...(reason === undefined ? {} : { reason }),
      tradeoffs,
    };
  }

  private providerFailureReason(
    error: unknown,
  ): AiSearchFallbackReason | undefined {
    if (error instanceof AiProviderInvalidOutputError) {
      return 'AI_INVALID_OUTPUT';
    }
    if (
      error instanceof AiProviderTimeoutError ||
      error instanceof AiProviderUnavailableError
    ) {
      return 'AI_PROVIDER_TIMEOUT';
    }
    return undefined;
  }
}
