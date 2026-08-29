import { Injectable } from '@nestjs/common';
import { config } from '../../../common/config';
import {
  assistantFinalOutputJsonSchema,
  assistantFinalOutputSchema,
} from '../assistant.schema';
import {
  AiRequestLogService,
  AI_OPERATIONS,
  AI_OPERATION_STATUS,
} from '../ai-request-log.service';
import { GeminiClient } from '../gemini.client';
import {
  compareOutputJsonSchema,
  compareOutputSchema,
  type CompareOutput,
} from '../comparison.schema';
import { ASSISTANT_SYSTEM_PROMPT } from '../prompts/assistant.prompt';
import { COMPARE_SYSTEM_PROMPT } from '../prompts/compare.prompt';
import { GROUNDED_RECOMMENDATION_SYSTEM_PROMPT } from '../prompts/grounded-recommendation.prompt';
import { SEARCH_INTENT_SYSTEM_PROMPT } from '../prompts/search-intent.prompt';
import { REVIEW_SUMMARY_SYSTEM_PROMPT } from '../prompts/review-summary.prompt';
import {
  reviewSummaryJsonSchema,
  reviewSummaryOutputSchema,
  type ReviewSummaryOutput,
} from '../review-summary.schema';
import {
  recommendationJsonSchema,
  recommendationOutputSchema,
  type GroundedRecommendationInput,
  type GroundedRecommendationOutput,
} from '../recommendation.schema';
import {
  searchIntentJsonSchema,
  searchIntentSchema,
  type SearchIntent,
} from '../search-intent.schema';
import {
  type AiProvider,
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type SearchIntentInput,
  type AssistantTurnInput,
  type AssistantTurnOutput,
  type CompareProviderInput,
} from './ai-provider';

@Injectable()
export class GeminiAiProvider implements AiProvider {
  constructor(
    private readonly client: GeminiClient,
    private readonly requestLogs: AiRequestLogService,
  ) {}

  extractSearchIntent(input: SearchIntentInput): Promise<SearchIntent> {
    return this.runOperation(
      AI_OPERATIONS.searchIntent,
      () =>
        this.client.generateStructured({
          systemInstruction: SEARCH_INTENT_SYSTEM_PROMPT,
          data: { userQuery: input.query },
          responseJsonSchema: searchIntentJsonSchema,
          maxOutputTokens: 1_024,
        }),
      (response) => searchIntentSchema.parse(response.value),
    );
  }

  generateGroundedRecommendation(
    input: GroundedRecommendationInput,
  ): Promise<GroundedRecommendationOutput> {
    return this.runOperation(
      AI_OPERATIONS.groundedRecommendation,
      () =>
        this.client.generateStructured({
          systemInstruction: GROUNDED_RECOMMENDATION_SYSTEM_PROMPT,
          data: input,
          responseJsonSchema: recommendationJsonSchema,
          maxOutputTokens: 2_048,
        }),
      (response) => {
        const output = recommendationOutputSchema.parse(response.value);
        if (output.recommendations.length > input.limit) {
          throw new AiProviderInvalidOutputError(
            'Model returned too many recommendations',
          );
        }
        const candidateIds = new Set(input.candidates.map(({ id }) => id));
        if (
          output.recommendations.some(
            ({ productId }) => !candidateIds.has(productId),
          )
        ) {
          throw new AiProviderInvalidOutputError(
            'Model referenced a product outside the candidate set',
          );
        }
        return output;
      },
    );
  }

  compareProducts(input: CompareProviderInput): Promise<CompareOutput> {
    const allowedIds = new Set(input.products.map(({ id }) => id));
    return this.runOperation(
      AI_OPERATIONS.compare,
      () =>
        this.client.generateStructured({
          systemInstruction: COMPARE_SYSTEM_PROMPT,
          data: { products: input.products },
          responseJsonSchema: compareOutputJsonSchema,
          maxOutputTokens: 2_048,
        }),
      (response) => {
        const output = compareOutputSchema.parse(response.value);
        if (
          output.referencedProductIds.some(
            (productId) => !allowedIds.has(productId),
          )
        ) {
          throw new AiProviderInvalidOutputError(
            'Model referenced a product outside the requested set',
          );
        }
        return output;
      },
    );
  }

  chatWithTools(input: AssistantTurnInput): Promise<AssistantTurnOutput> {
    return this.runOperation(
      AI_OPERATIONS.assistantTurn,
      () =>
        this.client.generateAssistantTurn({
          systemInstruction: ASSISTANT_SYSTEM_PROMPT,
          messages: input.messages,
          tools: input.tools,
          exchanges: input.exchanges,
          responseJsonSchema: assistantFinalOutputJsonSchema,
          maxOutputTokens: 2_048,
        }),
      (response) => {
        if (response.kind === 'tool_calls') {
          if (
            response.calls.length === 0 ||
            response.calls.some(({ name }) => name.length === 0)
          ) {
            throw new AiProviderInvalidOutputError(
              'Model returned an invalid tool request',
            );
          }
          return { kind: 'tool_calls', calls: response.calls };
        }
        return {
          kind: 'final',
          output: assistantFinalOutputSchema.parse(response.value),
        };
      },
      input.userId,
    );
  }

  summarizeReviews(input: {
    readonly productId: string;
    readonly reviews: readonly {
      readonly rating: number;
      readonly comment: string;
    }[];
  }): Promise<ReviewSummaryOutput> {
    return this.runOperation(
      AI_OPERATIONS.reviewSummary,
      () =>
        this.client.generateStructured({
          systemInstruction: REVIEW_SUMMARY_SYSTEM_PROMPT,
          data: {
            productId: input.productId,
            reviews: input.reviews.slice(0, 100),
          },
          responseJsonSchema: reviewSummaryJsonSchema,
          maxOutputTokens: 1_500,
        }),
      (response) => reviewSummaryOutputSchema.parse(response.value),
    );
  }

  private async runOperation<
    TResponse extends {
      readonly inputTokens?: number;
      readonly outputTokens?: number;
    },
    TResult,
  >(
    operation: string,
    request: () => Promise<TResponse>,
    parse: (response: TResponse) => TResult,
    userId?: string,
  ): Promise<TResult> {
    const startedAt = process.hrtime.bigint();
    let usage: TResponse | undefined;
    try {
      usage = await request();
      let parsed: TResult;
      try {
        parsed = parse(usage);
      } catch (error) {
        if (error instanceof AiProviderInvalidOutputError) throw error;
        throw new AiProviderInvalidOutputError();
      }
      await this.log(
        operation,
        AI_OPERATION_STATUS.success,
        startedAt,
        usage,
        userId,
      );
      return parsed;
    } catch (error) {
      await this.log(
        operation,
        this.statusFor(error),
        startedAt,
        usage,
        userId,
      );
      throw error;
    }
  }

  private statusFor(error: unknown): string {
    if (error instanceof AiProviderInvalidOutputError) {
      return AI_OPERATION_STATUS.invalidOutput;
    }
    if (error instanceof AiProviderTimeoutError) {
      return AI_OPERATION_STATUS.timeout;
    }
    if (error instanceof AiProviderUnavailableError) {
      return AI_OPERATION_STATUS.unavailable;
    }
    return AI_OPERATION_STATUS.unavailable;
  }

  private log(
    operation: string,
    status: string,
    startedAt: bigint,
    usage?: {
      readonly inputTokens?: number;
      readonly outputTokens?: number;
    },
    userId?: string,
  ): Promise<void> {
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    return this.requestLogs.record({
      operation,
      model: config.gemini.model,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      latencyMs: Math.round(latencyMs * 100) / 100,
      status,
      userId,
    });
  }
}
