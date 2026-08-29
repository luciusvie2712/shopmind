import type {
  ProductListContract,
  SemanticSearchContract,
} from '@shopmind/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import {
  EMBEDDING_PROVIDER,
  type EmbeddingProvider,
  EmbeddingProviderTimeoutError,
  EmbeddingProviderUnavailableError,
  InvalidEmbeddingVectorError,
} from '../ai/embedding/embedding-provider';
import { toProductSummaryContract } from '../products/product.mapper';
import { toSlug } from '../../common/text/slug';
import type { SearchProductsQueryDto } from './dto/search-products-query.dto';
import type { SemanticSearchDto } from './dto/semantic-search.dto';
import {
  applyPreferenceMatches,
  boundHybridCandidates,
  boundedHybridLimit,
  HYBRID_SEARCH_LIMITS,
  type HybridSearchFilters,
  type HybridSearchInput,
  mergeSearchCandidates,
  satisfiesHardConstraints,
} from './hybrid-search';
import { type RankedSearchCandidate, rankSearchCandidates } from './ranking';
import { toProductSearchCriteria } from './search-query';
import { SearchRepository } from './search.repository';
import { VectorSearchRepository } from './vector-search.repository';
import { EventsRepository } from '../events/events.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly vectorSearchRepository: VectorSearchRepository,
    private readonly eventsRepository: EventsRepository,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async search(query: SearchProductsQueryDto): Promise<ProductListContract> {
    const criteria = toProductSearchCriteria(query);
    const result = await this.searchRepository.search(criteria);
    return {
      items: result.products.map(toProductSummaryContract),
      page: criteria.page,
      pageSize: criteria.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / criteria.pageSize),
    };
  }

  async semantic(input: SemanticSearchDto): Promise<SemanticSearchContract> {
    if (
      input.minPrice !== undefined &&
      input.maxPrice !== undefined &&
      input.minPrice > input.maxPrice
    ) {
      throw new ApiException(
        ERROR_CODES.VALIDATION_ERROR,
        'minPrice must not exceed maxPrice',
      );
    }

    try {
      const embedding = await this.embedQuery(input.query);
      const candidates = await this.vectorSearchRepository.search({
        embedding,
        limit: input.limit,
        category: input.category,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
      });
      return {
        items: candidates.map(({ product, semanticSimilarity }) => ({
          product: toProductSummaryContract(product),
          semanticSimilarity,
        })),
      };
    } catch (error) {
      throw this.toEmbeddingApiError(error);
    }
  }

  async searchHybrid(
    input: HybridSearchInput,
  ): Promise<readonly RankedSearchCandidate[]> {
    const criteria = this.toHybridCriteria(input);

    try {
      const embedding = await this.embedQuery(
        input.semanticQuery?.trim() || criteria.query,
      );
      const [keywordCandidates, semanticCandidates] = await Promise.all([
        this.searchRepository.searchCandidates({
          ...criteria.filters,
          query: criteria.query,
          limit: HYBRID_SEARCH_LIMITS.branch,
        }),
        this.vectorSearchRepository.search({
          ...criteria.filters,
          embedding,
          limit: HYBRID_SEARCH_LIMITS.branch,
        }),
      ]);
      const candidates = mergeSearchCandidates(
        keywordCandidates,
        semanticCandidates,
      );
      const eligibleCandidates = applyPreferenceMatches(
        candidates.filter((candidate) =>
          satisfiesHardConstraints(candidate, criteria.filters),
        ),
        input.preferenceTerms,
        input.negativePreferences,
      );

      const behaviorSignals = await this.feedbackSignals(eligibleCandidates);
      return boundHybridCandidates(
        rankSearchCandidates(eligibleCandidates, behaviorSignals),
        criteria.limit,
      );
    } catch (error) {
      throw this.toEmbeddingApiError(error);
    }
  }

  async searchFallback(
    input: HybridSearchInput,
  ): Promise<readonly RankedSearchCandidate[]> {
    try {
      return await this.searchHybrid(input);
    } catch (error) {
      if (
        !(error instanceof ApiException) ||
        (error.code !== ERROR_CODES.AI_PROVIDER_TIMEOUT &&
          error.code !== ERROR_CODES.AI_INVALID_OUTPUT)
      ) {
        throw error;
      }
    }

    return this.searchKeywordOnly(input);
  }

  async searchKeywordOnly(
    input: HybridSearchInput,
  ): Promise<readonly RankedSearchCandidate[]> {
    const criteria = this.toHybridCriteria(input);
    const keywordCandidates = await this.searchRepository.searchCandidates({
      ...criteria.filters,
      query: criteria.query,
      limit: HYBRID_SEARCH_LIMITS.branch,
    });
    const candidates = applyPreferenceMatches(
      mergeSearchCandidates(keywordCandidates, []).filter((candidate) =>
        satisfiesHardConstraints(candidate, criteria.filters),
      ),
      input.preferenceTerms,
      input.negativePreferences,
    );
    const behaviorSignals = await this.feedbackSignals(candidates);
    return boundHybridCandidates(
      rankSearchCandidates(candidates, behaviorSignals),
      criteria.limit,
    );
  }

  private embedQuery(query: string): Promise<number[]> {
    return this.embeddingProvider.embedText(query);
  }

  private async feedbackSignals(
    candidates: readonly { readonly product: { readonly id: string } }[],
  ): Promise<ReadonlyMap<string, number>> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);
    const signals = await this.eventsRepository.behaviorSignals(
      candidates.map(({ product }) => product.id),
      since,
    );
    return new Map(signals.map(({ productId, score }) => [productId, score]));
  }

  private toEmbeddingApiError(error: unknown): unknown {
    if (error instanceof InvalidEmbeddingVectorError) {
      return new ApiException(
        ERROR_CODES.AI_INVALID_OUTPUT,
        'Embedding provider returned invalid output',
      );
    }
    if (
      error instanceof EmbeddingProviderTimeoutError ||
      error instanceof EmbeddingProviderUnavailableError
    ) {
      return new ApiException(
        ERROR_CODES.AI_PROVIDER_TIMEOUT,
        'Embedding provider is unavailable',
      );
    }
    return error;
  }

  private toHybridCriteria(input: HybridSearchInput): {
    readonly query: string;
    readonly limit: number;
    readonly filters: HybridSearchFilters;
  } {
    const query = input.query.trim().replace(/\s+/g, ' ');
    if (query.length < 2) {
      throw new ApiException(
        ERROR_CODES.VALIDATION_ERROR,
        'query must contain at least 2 characters',
      );
    }
    if (
      input.minPrice !== undefined &&
      input.maxPrice !== undefined &&
      input.minPrice > input.maxPrice
    ) {
      throw new ApiException(
        ERROR_CODES.VALIDATION_ERROR,
        'minPrice must not exceed maxPrice',
      );
    }

    const category =
      input.category === undefined ? undefined : toSlug(input.category);
    const brand = input.brand?.trim();
    const brands = input.brands?.map((value) => value.trim()).filter(Boolean);
    const requiredFeatures = input.requiredFeatures
      ?.map((value) => value.trim())
      .filter(Boolean);
    return {
      query,
      limit: boundedHybridLimit(input.limit),
      filters: {
        ...(category === undefined ? {} : { category }),
        ...(input.minPrice === undefined ? {} : { minPrice: input.minPrice }),
        ...(input.maxPrice === undefined ? {} : { maxPrice: input.maxPrice }),
        ...(brand === undefined ? {} : { brand }),
        ...(brands === undefined || brands.length === 0 ? {} : { brands }),
        ...(input.minRating === undefined
          ? {}
          : { minRating: input.minRating }),
        ...(requiredFeatures === undefined || requiredFeatures.length === 0
          ? {}
          : { requiredFeatures }),
        inStockOnly: input.inStockOnly ?? true,
      },
    };
  }
}
