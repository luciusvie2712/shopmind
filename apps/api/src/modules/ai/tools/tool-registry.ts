import { Injectable } from '@nestjs/common';
import { ZodError } from 'zod';
import { AiProviderInvalidOutputError } from '../provider/ai-provider';
import { CompareProductsTool } from './compare-products.tool';
import { GetCategoriesTool } from './get-categories.tool';
import { GetProductTool } from './get-product.tool';
import { GetUserPreferencesTool } from './get-user-preferences.tool';
import { GetWishlistTool } from './get-wishlist.tool';
import { SearchProductsTool } from './search-products.tool';
import type {
  AiTool,
  AiToolExecutionContext,
  AiToolResult,
} from './tool-contract';

export const AI_TOOL_NAMES = [
  'search_products',
  'get_product',
  'compare_products',
  'get_categories',
  'get_user_preferences',
  'get_wishlist',
] as const;

@Injectable()
export class AiToolRegistry {
  private readonly tools: ReadonlyMap<string, AiTool>;

  constructor(
    searchProducts: SearchProductsTool,
    getProduct: GetProductTool,
    compareProducts: CompareProductsTool,
    getCategories: GetCategoriesTool,
    getUserPreferences: GetUserPreferencesTool,
    getWishlist: GetWishlistTool,
  ) {
    const tools: readonly AiTool[] = [
      searchProducts,
      getProduct,
      compareProducts,
      getCategories,
      getUserPreferences,
      getWishlist,
    ];
    this.tools = new Map(tools.map((tool) => [tool.declaration.name, tool]));
  }

  declarations() {
    return [...this.tools.values()].map(({ declaration }) => declaration);
  }

  names(): readonly string[] {
    return [...this.tools.keys()];
  }

  async execute(
    name: string,
    input: unknown,
    context: AiToolExecutionContext,
  ): Promise<AiToolResult> {
    const tool = this.tools.get(name);
    if (tool === undefined) {
      throw new AiProviderInvalidOutputError(`Unknown AI tool: ${name}`);
    }
    try {
      return await tool.execute(input, context);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AiProviderInvalidOutputError(
          `Invalid arguments for AI tool: ${name}`,
        );
      }
      throw error;
    }
  }
}
