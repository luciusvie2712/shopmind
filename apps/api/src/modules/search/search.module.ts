import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../ai/embedding/embedding.module';
import { SearchController } from './search.controller';
import { SearchRepository } from './search.repository';
import { SearchService } from './search.service';
import { VectorSearchRepository } from './vector-search.repository';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EmbeddingModule, EventsModule],
  controllers: [SearchController],
  providers: [SearchRepository, SearchService, VectorSearchRepository],
  exports: [SearchService, VectorSearchRepository],
})
export class SearchModule {}
