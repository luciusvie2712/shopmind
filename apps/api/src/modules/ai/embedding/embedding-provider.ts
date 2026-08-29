export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
export const MULTIMODAL_EMBEDDING_PROVIDER = Symbol(
  'MULTIMODAL_EMBEDDING_PROVIDER',
);

export interface MultimodalEmbeddingProvider {
  embedImage(
    data: Buffer,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<number[]>;
}

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
}

export class InvalidEmbeddingVectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidEmbeddingVectorError.name;
  }
}

export class EmbeddingProviderTimeoutError extends Error {
  constructor() {
    super('Embedding provider timed out');
    this.name = EmbeddingProviderTimeoutError.name;
  }
}

export class EmbeddingProviderUnavailableError extends Error {
  constructor() {
    super('Embedding provider is unavailable');
    this.name = EmbeddingProviderUnavailableError.name;
  }
}

export function validateEmbeddingVector(
  value: unknown,
  dimension: number,
): number[] {
  if (!Array.isArray(value) || value.length !== dimension) {
    throw new InvalidEmbeddingVectorError(
      `Embedding must contain exactly ${dimension} values`,
    );
  }
  const vector: number[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      throw new InvalidEmbeddingVectorError(
        'Embedding values must be finite numbers',
      );
    }
    vector.push(item);
  }
  return vector;
}
