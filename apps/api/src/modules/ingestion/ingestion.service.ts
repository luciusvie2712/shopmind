import { Injectable, Logger } from '@nestjs/common';
import { CatalogCacheService } from '../../common/cache/catalog-cache.service';
import { QueueService } from '../../common/queue/queue.service';
import { DummyJsonClient } from './dummy-json.client';
import { parseDummyJsonProductsPayload } from './dummy-json.schema';
import { normalizeDummyJsonProduct } from './product-normalizer';
import {
  ProductImportRepository,
  type ProductImportSummary,
} from './product-import.repository';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly dummyJsonClient: DummyJsonClient,
    private readonly productImportRepository: ProductImportRepository,
    private readonly catalogCache: CatalogCacheService,
    private readonly queueService: QueueService,
  ) {}

  async bootstrapCatalog(): Promise<
    | { readonly status: 'skipped' }
    | { readonly status: 'imported'; readonly summary: ProductImportSummary }
  > {
    if (await this.productImportRepository.hasProducts()) {
      this.logger.log({
        operation: 'bootstrap_catalog',
        status: 'skipped',
        reason: 'catalog_not_empty',
      });
      return { status: 'skipped' };
    }

    this.logger.log({ operation: 'bootstrap_catalog', status: 'started' });
    const summary = await this.importProducts();
    this.logger.log({
      operation: 'bootstrap_catalog',
      status: 'completed',
      ...summary,
    });
    return { status: 'imported', summary };
  }

  async importProducts(): Promise<ProductImportSummary> {
    const externalPayload = await this.dummyJsonClient.fetchProducts();
    const payload = parseDummyJsonProductsPayload(externalPayload);
    const products = payload.products.map(normalizeDummyJsonProduct);
    const result = await this.productImportRepository.importProducts(products);

    await this.catalogCache.invalidateCatalog(result.affectedProductIds);
    try {
      for (const job of result.embeddingJobs) {
        await this.queueService.enqueueEmbedProduct(job);
      }
    } catch (error) {
      this.logger.error({
        operation: 'enqueue_product_embeddings',
        status: 'failure',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
    this.logger.log({
      operation: 'import_products',
      status: 'success',
      embeddingJobs: result.embeddingJobs.length,
      ...result.summary,
    });
    return result.summary;
  }
}
