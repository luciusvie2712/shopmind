import type { MultimodalSearchContract } from '@shopmind/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { config } from '../../common/config';
import {
  MULTIMODAL_EMBEDDING_PROVIDER,
  type MultimodalEmbeddingProvider,
} from '../ai/embedding/embedding-provider';
import { toProductSummaryContract } from '../products/product.mapper';
import { VectorSearchRepository } from '../search/vector-search.repository';
import type { MultimodalSearchDto } from './dto/multimodal-search.dto';
import { validateImageUpload } from './image-validation';
@Injectable()
export class MultimodalSearchService {
  constructor(
    @Inject(MULTIMODAL_EMBEDDING_PROVIDER)
    private readonly embeddings: MultimodalEmbeddingProvider,
    private readonly vectors: VectorSearchRepository,
  ) {}
  async search(
    file: { readonly buffer: Buffer; readonly mimetype: string } | undefined,
    input: MultimodalSearchDto,
  ): Promise<MultimodalSearchContract> {
    const mime = validateImageUpload(file, config.ai.multimodalMaxUploadBytes);
    const embedding = await this.embeddings.embedImage(file!.buffer, mime);
    const candidates = await this.vectors.search({
      embedding,
      limit: input.limit,
      category: input.category,
      maxPrice: input.maxPrice,
    });
    return {
      mode: 'image_to_text',
      items: candidates.map(({ product, semanticSimilarity }) => ({
        product: toProductSummaryContract(product),
        semanticSimilarity,
      })),
    };
  }
}
