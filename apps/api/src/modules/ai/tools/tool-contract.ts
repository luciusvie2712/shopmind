import type { ProductSummaryContract } from '@shopmind/contracts';
import type { AssistantToolDeclaration } from '../provider/ai-provider';

export interface AiToolExecutionContext {
  readonly userId?: string;
  readonly requestId: string;
}

export interface AiToolResult {
  readonly output: unknown;
  readonly products: readonly ProductSummaryContract[];
}

export interface AiTool {
  readonly declaration: AssistantToolDeclaration;
  execute(
    input: unknown,
    context: AiToolExecutionContext,
  ): Promise<AiToolResult>;
}

export const AI_TOOL_LIMITS = {
  searchProducts: 10,
  categories: 100,
  wishlistProducts: 20,
  detailImages: 5,
  detailReviews: 3,
  detailDescriptionLength: 1_000,
  metadataAttributes: 8,
  metadataStringLength: 200,
} as const;
