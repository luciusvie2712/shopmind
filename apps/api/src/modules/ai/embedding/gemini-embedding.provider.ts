import { Injectable, Logger } from '@nestjs/common';
import { config } from '../../../common/config';
import {
  type EmbeddingProvider,
  type MultimodalEmbeddingProvider,
  validateEmbeddingVector,
} from './embedding-provider';
import { GeminiClient } from '../gemini.client';

export function embeddingProviderLogFields(
  status: string,
  latencyMs: number,
  error?: unknown,
) {
  return {
    ai: {
      operation: 'embedding',
      model: config.gemini.embeddingModel,
      status,
    },
    provider: 'gemini',
    latencyMs,
    ...(error === undefined
      ? {}
      : { errorType: error instanceof Error ? error.name : 'UnknownError' }),
  };
}

@Injectable()
export class GeminiEmbeddingProvider
  implements EmbeddingProvider, MultimodalEmbeddingProvider
{
  private readonly logger = new Logger(GeminiEmbeddingProvider.name);

  constructor(private readonly client: GeminiClient) {}

  async embedText(text: string): Promise<number[]> {
    const startedAt = process.hrtime.bigint();
    try {
      const vector = await this.client.embedText(text);
      const validated = validateEmbeddingVector(
        vector,
        config.gemini.embeddingDimension,
      );
      this.log('success', startedAt);
      return validated;
    } catch (error) {
      this.log('failure', startedAt, error);
      throw error;
    }
  }

  async embedImage(
    data: Buffer,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<number[]> {
    const startedAt = process.hrtime.bigint();
    try {
      const vector = await this.client.embedImage(data, mimeType);
      const validated = validateEmbeddingVector(
        vector,
        config.gemini.embeddingDimension,
      );
      this.log('success', startedAt);
      return validated;
    } catch (error) {
      this.log('failure', startedAt, error);
      throw error;
    }
  }

  private log(status: string, startedAt: bigint, error?: unknown): void {
    const latencyMs =
      Math.round(
        (Number(process.hrtime.bigint() - startedAt) / 1_000_000) * 100,
      ) / 100;
    this.logger[status === 'failure' ? 'warn' : 'log'](
      embeddingProviderLogFields(status, latencyMs, error),
    );
  }
}
