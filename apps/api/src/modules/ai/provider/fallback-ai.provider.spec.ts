import {
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  type AiProvider,
} from './ai-provider';
import { FallbackAiProvider } from './fallback-ai.provider';

function provider(extractSearchIntent: jest.Mock): AiProvider {
  return {
    extractSearchIntent,
    generateGroundedRecommendation: jest.fn(),
    compareProducts: jest.fn(),
    chatWithTools: jest.fn(),
    summarizeReviews: jest.fn(),
  };
}

describe('FallbackAiProvider', () => {
  it('does not call secondary on primary success', async () => {
    const primary = jest.fn().mockResolvedValue({
      semanticQuery: 'laptop',
      useCases: [],
      requiredFeatures: [],
      priorities: [],
      negativePreferences: [],
    });
    const secondary = jest.fn();
    const router = new FallbackAiProvider(
      provider(primary),
      provider(secondary),
    );
    await router.extractSearchIntent({ query: 'laptop' });
    expect(secondary).not.toHaveBeenCalled();
  });
  it('fails over once for an eligible transient failure', async () => {
    const primary = jest.fn().mockRejectedValue(new AiProviderTimeoutError());
    const expected = {
      semanticQuery: 'laptop',
      useCases: [],
      requiredFeatures: [],
      priorities: [],
      negativePreferences: [],
    };
    const secondary = jest.fn().mockResolvedValue(expected);
    const router = new FallbackAiProvider(
      provider(primary),
      provider(secondary),
    );
    await expect(
      router.extractSearchIntent({ query: 'laptop' }),
    ).resolves.toEqual(expected);
    expect(secondary).toHaveBeenCalledTimes(1);
  });
  it('does not fail over on invalid structured output', async () => {
    const primary = jest
      .fn()
      .mockRejectedValue(new AiProviderInvalidOutputError());
    const secondary = jest.fn();
    const router = new FallbackAiProvider(
      provider(primary),
      provider(secondary),
    );
    await expect(
      router.extractSearchIntent({ query: 'laptop' }),
    ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    expect(secondary).not.toHaveBeenCalled();
  });
});
