import type { ProductSummaryRecord } from '../products/product.repository';

export type SearchCandidateProductRecord = ProductSummaryRecord & {
  readonly description?: string;
};

export const HYBRID_SEARCH_LIMITS = {
  branch: 40,
  final: 20,
} as const;

export interface HybridSearchFilters {
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly brand?: string;
  readonly brands?: readonly string[];
  readonly minRating?: number;
  readonly inStockOnly?: boolean;
  readonly requiredFeatures?: readonly string[];
}

export interface HybridSearchInput extends HybridSearchFilters {
  readonly query: string;
  readonly semanticQuery?: string;
  readonly limit?: number;
  readonly preferenceTerms?: readonly string[];
  readonly negativePreferences?: readonly string[];
}

export interface KeywordCandidate {
  readonly product: SearchCandidateProductRecord;
  readonly keywordRelevance: number;
}

export interface SemanticCandidateInput {
  readonly product: SearchCandidateProductRecord;
  readonly semanticSimilarity: number;
}

export interface SearchCandidate {
  readonly product: SearchCandidateProductRecord;
  readonly semanticSimilarity: number;
  readonly keywordRelevance: number;
  readonly preferenceMatch: number;
}

export function applyPreferenceMatches(
  candidates: readonly SearchCandidate[],
  positiveTerms: readonly string[] = [],
  negativeTerms: readonly string[] = [],
): SearchCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    preferenceMatch: preferenceMatch(
      candidate.product,
      positiveTerms,
      negativeTerms,
    ),
  }));
}

function preferenceMatch(
  product: SearchCandidate['product'],
  positiveTerms: readonly string[],
  negativeTerms: readonly string[],
): number {
  if (positiveTerms.length === 0) return 0;
  const canonicalText = productCanonicalText(product);
  const positiveMatches = positiveTerms.filter((term) =>
    canonicalText.includes(term.toLowerCase()),
  ).length;
  const negativeMatches = negativeTerms.filter((term) =>
    canonicalText.includes(term.toLowerCase()),
  ).length;
  const positiveScore = positiveMatches / positiveTerms.length;
  const negativePenalty =
    negativeTerms.length === 0 ? 0 : negativeMatches / negativeTerms.length;
  return Math.max(0, Math.min(1, positiveScore - negativePenalty));
}

function productCanonicalText(product: SearchCandidate['product']): string {
  const description =
    'description' in product && typeof product.description === 'string'
      ? product.description
      : '';
  return [
    product.title,
    product.brand ?? '',
    product.category.name,
    product.category.slug,
    description,
  ]
    .join(' ')
    .toLowerCase();
}

export function mergeSearchCandidates(
  keywordCandidates: readonly KeywordCandidate[],
  semanticCandidates: readonly SemanticCandidateInput[],
): SearchCandidate[] {
  const candidates = new Map<string, SearchCandidate>();

  for (const { product, keywordRelevance } of keywordCandidates) {
    candidates.set(product.id, {
      product,
      keywordRelevance,
      semanticSimilarity: 0,
      preferenceMatch: 0,
    });
  }

  for (const { product, semanticSimilarity } of semanticCandidates) {
    const existing = candidates.get(product.id);
    candidates.set(product.id, {
      product,
      keywordRelevance: existing?.keywordRelevance ?? 0,
      semanticSimilarity,
      preferenceMatch: existing?.preferenceMatch ?? 0,
    });
  }

  return [...candidates.values()];
}

export function satisfiesHardConstraints(
  candidate: SearchCandidate,
  filters: HybridSearchFilters,
): boolean {
  const { product } = candidate;
  const price = Number(product.price);
  const rating = Number(product.rating);

  return (
    (filters.category === undefined ||
      product.category.slug === filters.category) &&
    (filters.minPrice === undefined || price >= filters.minPrice) &&
    (filters.maxPrice === undefined || price <= filters.maxPrice) &&
    (filters.brand === undefined ||
      product.brand?.toLocaleLowerCase() ===
        filters.brand.toLocaleLowerCase()) &&
    (filters.brands === undefined ||
      filters.brands.some(
        (brand) =>
          product.brand?.toLocaleLowerCase() === brand.toLocaleLowerCase(),
      )) &&
    (filters.minRating === undefined || rating >= filters.minRating) &&
    (filters.inStockOnly !== true || product.stock > 0) &&
    (filters.requiredFeatures === undefined ||
      filters.requiredFeatures.every((feature) =>
        productCanonicalText(product).includes(feature.toLowerCase()),
      ))
  );
}

export function boundedHybridLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isInteger(limit) || limit < 1) {
    return 10;
  }
  return Math.min(limit, HYBRID_SEARCH_LIMITS.final);
}

export function boundHybridCandidates<T>(
  candidates: readonly T[],
  limit: number | undefined,
): readonly T[] {
  return candidates.slice(0, boundedHybridLimit(limit));
}
