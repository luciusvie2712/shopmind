import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ApiException } from '../../../common/errors/api.exception';
import { ERROR_CODES } from '../../../common/errors/error-code';
import type {
  AiTool,
  AiToolExecutionContext,
  AiToolResult,
} from './tool-contract';

const inputSchema = z.object({}).strict();

@Injectable()
export class GetUserPreferencesTool implements AiTool {
  readonly declaration = {
    name: 'get_user_preferences',
    description:
      'READ-ONLY preference summary for the authenticated server-controlled user.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  } as const;

  execute(
    input: unknown,
    context: AiToolExecutionContext,
  ): Promise<AiToolResult> {
    inputSchema.parse(input);
    if (context.userId === undefined) {
      throw new ApiException(
        ERROR_CODES.AUTH_REQUIRED,
        'Authentication is required for user preferences',
      );
    }
    return Promise.resolve({
      output: {
        configured: false,
        preferredCategories: [],
        preferredBrands: [],
      },
      products: [],
    });
  }
}
