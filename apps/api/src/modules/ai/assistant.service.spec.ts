import type { ProductSummaryContract } from '@shopmind/contracts';
import { AiMessageRole } from '@prisma/client';
import { ApiException } from '../../common/errors/api.exception';
import { AssistantService } from './assistant.service';
import { ConversationService } from './conversation.service';
import {
  type AiProvider,
  AiProviderTimeoutError,
} from './provider/ai-provider';
import { AiToolRegistry } from './tools/tool-registry';

const conversationId = '00000000-0000-4000-8000-000000000010';
const userId = '00000000-0000-4000-8000-000000000011';
const productId = '00000000-0000-4000-8000-000000000012';

const product: ProductSummaryContract = {
  id: productId,
  title: 'Canonical product',
  brand: 'ShopMind',
  price: 999,
  rating: 4.5,
  stock: 4,
  thumbnail: null,
  category: {
    id: '00000000-0000-4000-8000-000000000013',
    slug: 'laptops',
    name: 'Laptops',
  },
};

describe('AssistantService', () => {
  const chatWithTools = jest.fn();
  const resolveOwned = jest.fn();
  const addUserMessage = jest.fn();
  const addAssistantMessage = jest.fn();
  const recentMessages = jest.fn();
  const execute = jest.fn();
  const declarations = jest.fn(() => []);
  const service = new AssistantService(
    { chatWithTools } as unknown as AiProvider,
    {
      resolveOwned,
      addUserMessage,
      addAssistantMessage,
      recentMessages,
    } as unknown as ConversationService,
    { execute, declarations } as unknown as AiToolRegistry,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    resolveOwned.mockResolvedValue({ id: conversationId, userId });
    addUserMessage.mockResolvedValue({ id: 'user-message' });
    addAssistantMessage.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000020',
      role: AiMessageRole.ASSISTANT,
      content: 'Safe final answer',
      createdAt: new Date('2026-08-23T00:00:00.000Z'),
    });
    recentMessages.mockResolvedValue([
      { role: AiMessageRole.USER, content: 'Find a laptop' },
    ]);
    execute.mockResolvedValue({ output: [], products: [] });
  });

  it('persists a valid final answer without tools', async () => {
    chatWithTools.mockResolvedValue({
      kind: 'final',
      output: { message: 'Safe final answer', referencedProductIds: [] },
    });
    await expect(
      service.sendMessage(userId, { message: 'Find a laptop' }, 'request-1'),
    ).resolves.toMatchObject({
      conversationId,
      message: { content: 'Safe final answer' },
      products: [],
    });
    expect(addUserMessage).toHaveBeenCalledTimes(1);
    expect(addAssistantMessage).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it('counts cumulative calls and never executes the fifth tool', async () => {
    chatWithTools
      .mockResolvedValueOnce({
        kind: 'tool_calls',
        calls: [1, 2, 3].map((index) => ({
          id: `call-${index}`,
          name: 'get_categories',
          args: {},
        })),
      })
      .mockResolvedValueOnce({
        kind: 'tool_calls',
        calls: [4, 5].map((index) => ({
          id: `call-${index}`,
          name: 'get_categories',
          args: {},
        })),
      });

    await expect(
      service.sendMessage(userId, { message: 'Find a laptop' }, 'request-2'),
    ).rejects.toBeInstanceOf(ApiException);
    expect(execute).toHaveBeenCalledTimes(4);
    expect(addAssistantMessage).not.toHaveBeenCalled();
  });

  it('rejects product IDs outside canonical tool context', async () => {
    chatWithTools
      .mockResolvedValueOnce({
        kind: 'tool_calls',
        calls: [{ name: 'get_product', args: { productId } }],
      })
      .mockResolvedValueOnce({
        kind: 'final',
        output: {
          message: 'Invented reference',
          referencedProductIds: ['00000000-0000-4000-8000-000000000099'],
        },
      });
    execute.mockResolvedValue({ output: product, products: [product] });

    await expect(
      service.sendMessage(userId, { message: 'Find a laptop' }, 'request-3'),
    ).rejects.toBeInstanceOf(ApiException);
    expect(addAssistantMessage).not.toHaveBeenCalled();
  });

  it('persists no fabricated assistant message on provider timeout', async () => {
    chatWithTools.mockRejectedValue(new AiProviderTimeoutError());
    await expect(
      service.sendMessage(userId, { message: 'Find a laptop' }, 'request-4'),
    ).rejects.toBeInstanceOf(ApiException);
    expect(addUserMessage).toHaveBeenCalledTimes(1);
    expect(addAssistantMessage).not.toHaveBeenCalled();
  });
});
