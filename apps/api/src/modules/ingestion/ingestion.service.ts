import { Injectable, Logger } from '@nestjs/common';
import { CatalogCacheService } from '../../common/cache/catalog-cache.service';
import { QueueService } from '../../common/queue/queue.service';
import { Inject } from '@nestjs/common';
import {
  PRODUCT_SOURCE_PROVIDER,
  type ProductSourceProvider,
} from './product-source.provider';
import {
  ProductImportRepository,
  type ProductImportSummary,
} from './product-import.repository';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @Inject(PRODUCT_SOURCE_PROVIDER)
    private readonly productSource: ProductSourceProvider,
    private readonly productImportRepository: ProductImportRepository,
    private readonly catalogCache: CatalogCacheService,
    private readonly queueService: QueueService,
  ) {}

  async bootstrapCatalog(
    options: { readonly force?: boolean } = {},
  ): Promise<
    | { readonly status: 'skipped' }
    | { readonly status: 'imported'; readonly summary: ProductImportSummary }
  > {
    if (!options.force && (await this.productImportRepository.hasProducts())) {
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
    const products = [];
    let cursor: string | undefined;
    do {
      const page = await this.productSource.fetchPage(cursor);
      products.push(...page.products);
      cursor = page.complete ? undefined : page.cursor;
      if (!page.complete && cursor === undefined)
        throw new Error('Product source returned an invalid cursor');
    } while (cursor !== undefined);
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
