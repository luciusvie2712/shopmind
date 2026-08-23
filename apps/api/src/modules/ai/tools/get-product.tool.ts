import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ProductsService } from '../../products/products.service';
import {
  boundedProductDetail,
  productSummaryFromDetail,
} from './canonical-product.projection';
import type { AiTool, AiToolResult } from './tool-contract';

const inputSchema = z.object({ productId: z.string().uuid() }).strict();

@Injectable()
export class GetProductTool implements AiTool {
  readonly declaration = {
    name: 'get_product',
    description: 'READ-ONLY bounded canonical ShopMind product detail.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: { productId: { type: 'string' } },
      required: ['productId'],
    },
  } as const;

  constructor(private readonly productsService: ProductsService) {}

  async execute(input: unknown): Promise<AiToolResult> {
    const { productId } = inputSchema.parse(input);
    const product = await this.productsService.detail(productId);
    return {
      output: boundedProductDetail(product),
      products: [productSummaryFromDetail(product)],
    };
  }
}
