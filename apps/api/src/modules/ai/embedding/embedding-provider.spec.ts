import { config } from '../../../common/config';
import { InvalidEmbeddingVectorError } from './embedding-provider';
import { GeminiClient } from '../gemini.client';
import {
  embeddingProviderLogFields,
  GeminiEmbeddingProvider,
} from './gemini-embedding.provider';

describe('GeminiEmbeddingProvider', () => {
  const validVector = Array.from(
    { length: config.gemini.embeddingDimension },
    (_, index) => index / 1_000,
  );

  function providerFor(value: unknown): GeminiEmbeddingProvider {
    const client = {
      embedText: jest.fn().mockResolvedValue(value),
    } as unknown as GeminiClient;
    return new GeminiEmbeddingProvider(client);
  }

  it('accepts exactly 768 finite values', async () => {
    await expect(providerFor(validVector).embedText('query')).resolves.toEqual(
      validVector,
    );
    expect(embeddingProviderLogFields('success', 12.5)).toEqual({
      ai: {
        operation: 'embedding',
        model: config.gemini.embeddingModel,
        status: 'success',
      },
      provider: 'gemini',
      latencyMs: 12.5,
    });
  });

  it.each([767, 769])('rejects a vector with %i values', async (length) => {
    await expect(
      providerFor(Array.from({ length }, () => 0)).embedText('query'),
    ).rejects.toBeInstanceOf(InvalidEmbeddingVectorError);
    expect(
      embeddingProviderLogFields(
        'failure',
        9,
        new InvalidEmbeddingVectorError('invalid test vector'),
      ),
    ).toMatchObject({
      ai: { operation: 'embedding', status: 'failure' },
      latencyMs: 9,
      errorType: 'InvalidEmbeddingVectorError',
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a non-finite value',
    async (invalidValue) => {
      const vector = [...validVector];
      vector[0] = invalidValue;
      await expect(
        providerFor(vector).embedText('query'),
      ).rejects.toBeInstanceOf(InvalidEmbeddingVectorError);
    },
  );
});
