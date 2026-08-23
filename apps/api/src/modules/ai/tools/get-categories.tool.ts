import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CategoriesService } from '../../categories/categories.service';
import type { AiTool, AiToolResult } from './tool-contract';
import { AI_TOOL_LIMITS } from './tool-contract';

const inputSchema = z.object({}).strict();

@Injectable()
export class GetCategoriesTool implements AiTool {
  readonly declaration = {
    name: 'get_categories',
    description: 'READ-ONLY bounded canonical ShopMind category list.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  } as const;

  constructor(private readonly categoriesService: CategoriesService) {}

  async execute(input: unknown): Promise<AiToolResult> {
    inputSchema.parse(input);
    return {
      output: (await this.categoriesService.list()).slice(
        0,
        AI_TOOL_LIMITS.categories,
      ),
      products: [],
    };
  }
}
