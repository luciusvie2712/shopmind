import type { SearchIntent } from '../search-intent.schema';
import type {
  GroundedRecommendationInput,
  GroundedRecommendationOutput,
} from '../recommendation.schema';

export const AI_SEARCH_PROVIDER = Symbol('AI_SEARCH_PROVIDER');

export interface SearchIntentInput {
  readonly query: string;
}

export interface AiSearchProvider {
  extractSearchIntent(input: SearchIntentInput): Promise<SearchIntent>;
  generateGroundedRecommendation(
    input: GroundedRecommendationInput,
  ): Promise<GroundedRecommendationOutput>;
}

// Phase-9 input/output types remain intentionally unbound until those
// capabilities are implemented. Phase 8 injects only AiSearchProvider.
export interface CompareProviderInput {
  readonly products: readonly ComparisonProductContract[];
}

export interface AssistantProviderMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface AssistantToolDeclaration {
  readonly name: string;
  readonly description: string;
  readonly parametersJsonSchema: unknown;
}

export interface AssistantToolCall {
  readonly id?: string;
  readonly name: string;
  readonly args: unknown;
}

export interface AssistantToolResult {
  readonly id?: string;
  readonly name: string;
  readonly output: unknown;
}

export interface AssistantToolExchange {
  readonly calls: readonly AssistantToolCall[];
  readonly results: readonly AssistantToolResult[];
}

export interface AssistantTurnInput {
  readonly messages: readonly AssistantProviderMessage[];
  readonly tools: readonly AssistantToolDeclaration[];
  readonly exchanges: readonly AssistantToolExchange[];
  readonly userId: string;
}

export type AssistantTurnOutput =
  | {
      readonly kind: 'tool_calls';
      readonly calls: readonly AssistantToolCall[];
    }
  | { readonly kind: 'final'; readonly output: AssistantFinalOutput };

export interface AiProvider extends AiSearchProvider {
  compareProducts(input: CompareProviderInput): Promise<CompareOutput>;
  chatWithTools(input: AssistantTurnInput): Promise<AssistantTurnOutput>;
  summarizeReviews(input: {
    readonly productId: string;
    readonly reviews: readonly {
      readonly rating: number;
      readonly comment: string;
    }[];
  }): Promise<ReviewSummaryOutput>;
}

export class AiProviderInvalidOutputError extends Error {
  constructor(message = 'AI provider returned invalid structured output') {
    super(message);
    this.name = AiProviderInvalidOutputError.name;
  }
}

export class AiProviderTimeoutError extends Error {
  constructor() {
    super('AI provider timed out');
    this.name = AiProviderTimeoutError.name;
  }
}

export class AiProviderUnavailableError extends Error {
  constructor() {
    super('AI provider is unavailable');
    this.name = AiProviderUnavailableError.name;
  }
}
import type { ComparisonProductContract } from '@shopmind/contracts';
import type { AssistantFinalOutput } from '../assistant.schema';
import type { CompareOutput } from '../comparison.schema';
import type { ReviewSummaryOutput } from '../review-summary.schema';
