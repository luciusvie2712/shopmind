import type {
  AssistantTurnContract,
  ProductSummaryContract,
} from '@shopmind/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { AiMessageRole } from '@prisma/client';
import { config } from '../../common/config';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import type { AssistantMessageDto } from './dto/assistant-message.dto';
import {
  AI_SEARCH_PROVIDER,
  type AiProvider,
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AssistantToolExchange,
} from './provider/ai-provider';
import { ConversationService } from './conversation.service';
import { AiToolRegistry } from './tools/tool-registry';

@Injectable()
export class AssistantService {
  constructor(
    @Inject(AI_SEARCH_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly conversations: ConversationService,
    private readonly tools: AiToolRegistry,
  ) {}

  async sendMessage(
    userId: string,
    input: AssistantMessageDto,
    requestId: string,
  ): Promise<AssistantTurnContract> {
    const conversation = await this.conversations.resolveOwned(
      userId,
      input.conversationId,
    );
    await this.conversations.addUserMessage(
      conversation.id,
      input.message.trim(),
    );
    const history = await this.conversations.recentMessages(conversation.id);
    const messages = history.map((message) => ({
      role:
        message.role === AiMessageRole.ASSISTANT
          ? ('assistant' as const)
          : ('user' as const),
      content: message.content,
    }));
    const exchanges: AssistantToolExchange[] = [];
    const canonicalProducts = new Map<string, ProductSummaryContract>();
    let executedTools = 0;

    try {
      while (true) {
        const turn = await this.aiProvider.chatWithTools({
          messages,
          tools: this.tools.declarations(),
          exchanges,
          userId,
        });
        if (turn.kind === 'final') {
          const products = turn.output.referencedProductIds.map((productId) => {
            const product = canonicalProducts.get(productId);
            if (product === undefined) {
              throw new AiProviderInvalidOutputError(
                'Assistant referenced a product outside tool context',
              );
            }
            return product;
          });
          const message = await this.conversations.addAssistantMessage(
            conversation.id,
            turn.output.message,
          );
          return {
            conversationId: conversation.id,
            message: {
              id: message.id,
              role: 'ASSISTANT',
              content: message.content,
              createdAt: message.createdAt.toISOString(),
            },
            products,
            requestId,
          };
        }

        const results: AssistantToolExchange['results'][number][] = [];
        for (const call of turn.calls) {
          if (executedTools >= config.ai.maxToolSteps) {
            throw new AiProviderInvalidOutputError(
              'Assistant tool step limit reached',
            );
          }
          const result = await this.tools.execute(call.name, call.args, {
            userId,
            requestId,
          });
          executedTools += 1;
          result.products.forEach((product) =>
            canonicalProducts.set(product.id, product),
          );
          results.push({
            ...(call.id === undefined ? {} : { id: call.id }),
            name: call.name,
            output: result.output,
          });
        }
        exchanges.push({ calls: turn.calls, results });
      }
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  private toApiError(error: unknown): unknown {
    if (error instanceof AiProviderInvalidOutputError) {
      return new ApiException(ERROR_CODES.AI_INVALID_OUTPUT, error.message);
    }
    if (
      error instanceof AiProviderTimeoutError ||
      error instanceof AiProviderUnavailableError
    ) {
      return new ApiException(
        ERROR_CODES.AI_PROVIDER_TIMEOUT,
        'AI service did not respond in time',
      );
    }
    return error;
  }
}
