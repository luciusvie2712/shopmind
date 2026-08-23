import type { SearchCandidate } from './hybrid-search';

export const RANKING_WEIGHTS = {
  semantic: 0.45,
  keyword: 0.2,
  preference: 0.15,
  rating: 0.1,
  stock: 0.1,
} as const;

export interface RankingSignals {
  readonly semanticSimilarity: number;
  readonly keywordRelevance: number;
  readonly preferenceMatch: number;
  readonly normalizedRating: number;
  readonly stockSignal: number;
}

export interface RankedSearchCandidate extends RankingSignals {
  readonly product: SearchCandidate['product'];
  readonly score: number;
}

export function normalizeUnitSignal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function normalizeRating(rating: number): number {
  return normalizeUnitSignal(rating / 5);
}

export function stockSignal(stock: number): number {
  return stock > 0 ? 1 : 0;
}

export function rankingScore(signals: RankingSignals): number {
  return normalizeUnitSignal(
    RANKING_WEIGHTS.semantic * signals.semanticSimilarity +
      RANKING_WEIGHTS.keyword * signals.keywordRelevance +
      RANKING_WEIGHTS.preference * signals.preferenceMatch +
      RANKING_WEIGHTS.rating * signals.normalizedRating +
      RANKING_WEIGHTS.stock * signals.stockSignal,
  );
}

export function rankSearchCandidates(
  candidates: readonly SearchCandidate[],
): RankedSearchCandidate[] {
  return candidates
    .map((candidate) => {
      const signals: RankingSignals = {
        semanticSimilarity: normalizeUnitSignal(candidate.semanticSimilarity),
        keywordRelevance: normalizeUnitSignal(candidate.keywordRelevance),
        preferenceMatch: normalizeUnitSignal(candidate.preferenceMatch),
        normalizedRating: normalizeRating(Number(candidate.product.rating)),
        stockSignal: stockSignal(candidate.product.stock),
      };
      return {
        product: candidate.product,
        ...signals,
        score: rankingScore(signals),
      };
    })
    .sort(compareRankedCandidates);
}

function compareRankedCandidates(
  left: RankedSearchCandidate,
  right: RankedSearchCandidate,
): number {
  return (
    right.score - left.score ||
    right.semanticSimilarity - left.semanticSimilarity ||
    right.keywordRelevance - left.keywordRelevance ||
    right.normalizedRating - left.normalizedRating ||
    left.product.id.localeCompare(right.product.id)
  );
}
