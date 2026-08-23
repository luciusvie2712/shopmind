import { config } from '../../../common/config';
import { AiRequestLogService } from '../ai-request-log.service';
import { GeminiClient } from '../gemini.client';
import {
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
} from './ai-provider';
import { GeminiAiProvider } from './gemini-ai.provider';

const intent = {
  useCases: ['coding'],
  requiredFeatures: [],
  priorities: [],
  negativePreferences: [],
  semanticQuery: 'coding laptop',
};

describe('GeminiAiProvider', () => {
  const generateStructured = jest.fn();
  const generateAssistantTurn = jest.fn();
  const record = jest.fn().mockResolvedValue(undefined);
  const provider = new GeminiAiProvider(
    { generateStructured, generateAssistantTurn } as unknown as GeminiClient,
    { record } as unknown as AiRequestLogService,
  );

  beforeEach(() => {
    generateStructured.mockReset();
    generateAssistantTurn.mockReset();
    record.mockClear();
  });

  it('validates structured intent and records provider token usage', async () => {
    generateStructured.mockResolvedValue({
      value: intent,
      inputTokens: 12,
      outputTokens: 8,
    });
    await expect(
      provider.extractSearchIntent({ query: 'coding laptop' }),
    ).resolves.toEqual(intent);
    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 1_024 }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'search_intent',
        model: config.gemini.model,
        inputTokens: 12,
        outputTokens: 8,
        status: 'success',
      }),
    );
  });

  it('rejects malformed intent and records invalid output', async () => {
    generateStructured.mockResolvedValue({ value: { semanticQuery: '' } });
    await expect(
      provider.extractSearchIntent({ query: 'coding laptop' }),
    ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'invalid_output' }),
    );
  });

  it('records provider timeout without retrying', async () => {
    generateStructured.mockRejectedValue(new AiProviderTimeoutError());
    await expect(
      provider.extractSearchIntent({ query: 'coding laptop' }),
    ).rejects.toBeInstanceOf(AiProviderTimeoutError);
    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'timeout' }),
    );
  });

  it('rejects a recommendation ID outside the supplied allowlist', async () => {
    generateStructured.mockResolvedValue({
      value: {
        recommendations: [
          {
            productId: '00000000-0000-4000-8000-000000000099',
            reason: 'Invented',
            tradeoffs: [],
          },
        ],
      },
    });
    await expect(
      provider.generateGroundedRecommendation({
        intent,
        candidates: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            title: 'Canonical',
            brand: null,
            category: 'Laptops',
            price: 999,
            rating: 4.5,
            stock: 5,
            score: 0.8,
          },
        ],
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'grounded_recommendation',
        status: 'invalid_output',
      }),
    );
  });

  it('rejects compare references outside the requested allowlist', async () => {
    generateStructured.mockResolvedValue({
      value: {
        summary: 'Invented comparison',
        referencedProductIds: ['00000000-0000-4000-8000-000000000099'],
      },
    });
    await expect(
      provider.compareProducts({
        products: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            title: 'Canonical',
            brand: null,
            category: {
              id: '00000000-0000-4000-8000-000000000002',
              slug: 'laptops',
              name: 'Laptops',
            },
            price: 999,
            rating: 4.5,
            stock: 5,
            thumbnail: null,
            attributes: {},
          },
        ],
      }),
    ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'compare',
        status: 'invalid_output',
      }),
    );
  });

  it('normalizes and validates an assistant final response', async () => {
    generateAssistantTurn.mockResolvedValue({
      kind: 'final',
      value: { message: 'Grounded answer', referencedProductIds: [] },
      inputTokens: 20,
      outputTokens: 10,
    });
    await expect(
      provider.chatWithTools({
        messages: [{ role: 'user', content: 'Help me shop' }],
        tools: [],
        exchanges: [],
        userId: '00000000-0000-4000-8000-000000000003',
      }),
    ).resolves.toEqual({
      kind: 'final',
      output: { message: 'Grounded answer', referencedProductIds: [] },
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'assistant_turn',
        userId: '00000000-0000-4000-8000-000000000003',
      }),
    );
  });
});
