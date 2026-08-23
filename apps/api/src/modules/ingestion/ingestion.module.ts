import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../ai/embedding/embedding.module';
import { AuthModule } from '../auth/auth.module';
import { DummyJsonClient } from './dummy-json.client';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { EmbedProductProcessor } from './embed-product.processor';
import { ProductEmbeddingRepository } from './product-embedding.repository';
import { ProductImportRepository } from './product-import.repository';
import { SyncProductsProcessor } from './sync-products.processor';

@Module({
  imports: [EmbeddingModule, AuthModule],
  controllers: [IngestionController],
  providers: [
    DummyJsonClient,
    EmbedProductProcessor,
    IngestionService,
    ProductEmbeddingRepository,
    ProductImportRepository,
    SyncProductsProcessor,
  ],
  exports: [EmbedProductProcessor, IngestionService, SyncProductsProcessor],
})
export class IngestionModule {}
