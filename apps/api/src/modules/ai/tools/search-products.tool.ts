import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { toProductSummaryContract } from '../../products/product.mapper';
import { SearchService } from '../../search/search.service';
import type { AiTool, AiToolResult } from './tool-contract';
import { AI_TOOL_LIMITS } from './tool-contract';

const priceSchema = z
  .object({
    min: z.number().finite().nonnegative().optional(),
    max: z.number().finite().nonnegative().optional(),
  })
  .strict()
  .refine(
    ({ min, max }) => min === undefined || max === undefined || min <= max,
    'price.min must not exceed price.max',
  );

const searchProductsInputSchema = z
  .object({
    filters: z
      .object({
        category: z.string().trim().min(1).max(100).optional(),
        price: priceSchema.optional(),
        brands: z.array(z.string().trim().min(1).max(100)).max(8).optional(),
        minRating: z.number().finite().min(0).max(5).optional(),
      })
      .strict()
      .optional(),
    semanticQuery: z.string().trim().min(2).max(500),
    limit: z.number().int().min(1).max(20).optional(),
  })
  .strict();

@Injectable()
export class SearchProductsTool implements AiTool {
  readonly declaration = {
    name: 'search_products',
    description:
      'READ-ONLY deterministic hybrid search over bounded canonical ShopMind products.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        filters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            category: { type: 'string' },
            price: {
              type: 'object',
              additionalProperties: false,
              properties: {
                min: { type: 'number', minimum: 0 },
                max: { type: 'number', minimum: 0 },
              },
            },
            brands: { type: 'array', maxItems: 8, items: { type: 'string' } },
            minRating: { type: 'number', minimum: 0, maximum: 5 },
          },
        },
        semanticQuery: { type: 'string', maxLength: 500 },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
      required: ['semanticQuery'],
    },
  } as const;

  constructor(private readonly searchService: SearchService) {}

  async execute(input: unknown): Promise<AiToolResult> {
    const parsed = searchProductsInputSchema.parse(input);
    const candidates = (
      await this.searchService.searchFallback({
        query: parsed.semanticQuery,
        semanticQuery: parsed.semanticQuery,
        limit: Math.min(
          parsed.limit ?? AI_TOOL_LIMITS.searchProducts,
          AI_TOOL_LIMITS.searchProducts,
        ),
        category: parsed.filters?.category,
        minPrice: parsed.filters?.price?.min,
        maxPrice: parsed.filters?.price?.max,
        brands: parsed.filters?.brands,
        minRating: parsed.filters?.minRating,
        inStockOnly: true,
      })
    ).slice(0, AI_TOOL_LIMITS.searchProducts);
    const output = candidates.map((candidate) => ({
      ...toProductSummaryContract(candidate.product),
      score: candidate.score,
    }));
    return {
      output,
      products: candidates.map((candidate) =>
        toProductSummaryContract(candidate.product),
      ),
    };
  }
}
