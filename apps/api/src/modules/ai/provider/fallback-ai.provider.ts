import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { config } from '../../../common/config';
import type { SearchIntent } from '../search-intent.schema';
import type {
  GroundedRecommendationInput,
  GroundedRecommendationOutput,
} from '../recommendation.schema';
import type { CompareOutput } from '../comparison.schema';
import type { ReviewSummaryOutput } from '../review-summary.schema';
import {
  type AiProvider,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AssistantTurnInput,
  type AssistantTurnOutput,
  type CompareProviderInput,
  type SearchIntentInput,
} from './ai-provider';

export const PRIMARY_AI_PROVIDER = Symbol('PRIMARY_AI_PROVIDER');
export const SECONDARY_AI_PROVIDER = Symbol('SECONDARY_AI_PROVIDER');

export const AI_CAPABILITY_MATRIX = {
  structuredGeneration: true,
  toolCalling: true,
  reviewSummarization: true,
  embeddings: false,
  streaming: false,
  multimodal: false,
} as const;

@Injectable()
export class FallbackAiProvider implements AiProvider {
  private readonly logger = new Logger(FallbackAiProvider.name);
  constructor(
    @Inject(PRIMARY_AI_PROVIDER) private readonly primary: AiProvider,
    @Optional()
    @Inject(SECONDARY_AI_PROVIDER)
    private readonly secondary?: AiProvider,
  ) {}

  extractSearchIntent(input: SearchIntentInput): Promise<SearchIntent> {
    return this.run('search_intent', (provider) =>
      provider.extractSearchIntent(input),
    );
  }
  generateGroundedRecommendation(
    input: GroundedRecommendationInput,
  ): Promise<GroundedRecommendationOutput> {
    return this.run('grounded_recommendation', (provider) =>
      provider.generateGroundedRecommendation(input),
    );
  }
  compareProducts(input: CompareProviderInput): Promise<CompareOutput> {
    return this.run('compare', (provider) => provider.compareProducts(input));
  }
  chatWithTools(input: AssistantTurnInput): Promise<AssistantTurnOutput> {
    return this.run('assistant_turn', (provider) =>
      provider.chatWithTools(input),
    );
  }
  summarizeReviews(input: {
    readonly productId: string;
    readonly reviews: readonly {
      readonly rating: number;
      readonly comment: string;
    }[];
  }): Promise<ReviewSummaryOutput> {
    return this.run('review_summary', (provider) =>
      provider.summarizeReviews(input),
    );
  }

  private async run<T>(
    operation: string,
    invoke: (provider: AiProvider) => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      return await invoke(this.primary);
    } catch (error) {
      if (!this.isEligible(error) || this.secondary === undefined) throw error;
      const elapsed = Date.now() - startedAt;
      if (elapsed >= config.ai.fallbackTotalTimeoutMs) throw error;
      this.logger.warn({
        ai: {
          operation,
          provider: 'secondary',
          fallbackOccurred: true,
          reason: error.name,
        },
        elapsedMs: elapsed,
      });
      return this.withTimeout(
        invoke(this.secondary),
        config.ai.fallbackTotalTimeoutMs - elapsed,
      );
    }
  }

  private isEligible(
    error: unknown,
  ): error is AiProviderTimeoutError | AiProviderUnavailableError {
    return (
      error instanceof AiProviderTimeoutError ||
      error instanceof AiProviderUnavailableError
    );
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new AiProviderTimeoutError()),
        timeoutMs,
      );
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(
            error instanceof Error
              ? error
              : new Error('AI provider rejected with a non-error value'),
          );
        },
      );
    });
  }
}
