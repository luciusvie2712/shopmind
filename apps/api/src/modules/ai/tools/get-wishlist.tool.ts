import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ApiException } from '../../../common/errors/api.exception';
import { ERROR_CODES } from '../../../common/errors/error-code';
import { WishlistService } from '../../wishlist/wishlist.service';
import type {
  AiTool,
  AiToolExecutionContext,
  AiToolResult,
} from './tool-contract';
import { AI_TOOL_LIMITS } from './tool-contract';

const inputSchema = z.object({}).strict();

@Injectable()
export class GetWishlistTool implements AiTool {
  readonly declaration = {
    name: 'get_wishlist',
    description:
      'READ-ONLY bounded canonical wishlist for the authenticated server-controlled user.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  } as const;

  constructor(private readonly wishlistService: WishlistService) {}

  async execute(
    input: unknown,
    context: AiToolExecutionContext,
  ): Promise<AiToolResult> {
    inputSchema.parse(input);
    if (context.userId === undefined) {
      throw new ApiException(
        ERROR_CODES.AUTH_REQUIRED,
        'Authentication is required for wishlist access',
      );
    }
    const products = (
      await this.wishlistService.list(context.userId)
    ).items.slice(0, AI_TOOL_LIMITS.wishlistProducts);
    return { output: products, products };
  }
}
