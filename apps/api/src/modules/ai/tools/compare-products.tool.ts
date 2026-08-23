import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ProductComparisonFactsService } from '../product-comparison-facts.service';
import type { AiTool, AiToolResult } from './tool-contract';

const inputSchema = z
  .object({ productIds: z.array(z.string().uuid()).min(2).max(4) })
  .strict()
  .refine(
    ({ productIds }) => new Set(productIds).size === productIds.length,
    'product IDs must be unique',
  );

@Injectable()
export class CompareProductsTool implements AiTool {
  readonly declaration = {
    name: 'compare_products',
    description:
      'READ-ONLY canonical facts for exactly 2 to 4 ShopMind products; performs no AI call.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        productIds: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          uniqueItems: true,
          items: { type: 'string' },
        },
      },
      required: ['productIds'],
    },
  } as const;

  constructor(
    private readonly comparisonFacts: ProductComparisonFactsService,
  ) {}

  async execute(input: unknown): Promise<AiToolResult> {
    const { productIds } = inputSchema.parse(input);
    const products = await this.comparisonFacts.getFacts(productIds);
    return { output: products, products };
  }
}
