import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../ai/embedding/embedding.module';
import { SearchModule } from '../search/search.module';
import { MultimodalSearchController } from './multimodal-search.controller';
import { MultimodalSearchService } from './multimodal-search.service';
@Module({
  imports: [EmbeddingModule, SearchModule],
  controllers: [MultimodalSearchController],
  providers: [MultimodalSearchService],
})
export class MultimodalModule {}
