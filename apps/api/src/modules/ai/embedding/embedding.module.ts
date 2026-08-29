import { Module } from '@nestjs/common';
import { GeminiClient } from '../gemini.client';
import {
  EMBEDDING_PROVIDER,
  MULTIMODAL_EMBEDDING_PROVIDER,
} from './embedding-provider';
import { GeminiEmbeddingProvider } from './gemini-embedding.provider';

@Module({
  providers: [
    GeminiClient,
    GeminiEmbeddingProvider,
    { provide: EMBEDDING_PROVIDER, useExisting: GeminiEmbeddingProvider },
    {
      provide: MULTIMODAL_EMBEDDING_PROVIDER,
      useExisting: GeminiEmbeddingProvider,
    },
  ],
  exports: [EMBEDDING_PROVIDER, MULTIMODAL_EMBEDDING_PROVIDER, GeminiClient],
})
export class EmbeddingModule {}
