import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../ai/embedding/embedding.module';
import { SearchController } from './search.controller';
import { SearchRepository } from './search.repository';
import { SearchService } from './search.service';
import { VectorSearchRepository } from './vector-search.repository';

@Module({
  imports: [EmbeddingModule],
  controllers: [SearchController],
  providers: [SearchRepository, SearchService, VectorSearchRepository],
  exports: [SearchService],
})
export class SearchModule {}
