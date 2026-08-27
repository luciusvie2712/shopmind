import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/common/database/prisma.service';
import { CatalogCacheService } from '../src/common/cache/catalog-cache.service';
import { QueueService } from '../src/common/queue/queue.service';
import {
  embeddingJobId,
  type EmbedProductJobData,
} from '../src/common/queue/queue.constants';
import { DummyJsonClient } from '../src/modules/ingestion/dummy-json.client';
import { IngestionService } from '../src/modules/ingestion/ingestion.service';
import { ProductImportRepository } from '../src/modules/ingestion/product-import.repository';
import { ProductEmbeddingRepository } from '../src/modules/ingestion/product-embedding.repository';

function product(id: number) {
  return {
    id,
    title: `Importer regression ${id}`,
    description: 'Canonical description before change',
    category: id === 970003 ? 'import-regression-other' : 'import-regression',
    price: 99,
    stock: 5,
    rating: 4,
    images: [`https://example.com/${id}.jpg`],
    reviews: [
      {
        rating: 4,
        comment: 'Original review',
        date: '2026-01-01T00:00:00Z',
        reviewerName: 'Fixture',
      },
    ],
  };
}

function payload(
  products = [product(970001), product(970002), product(970003)],
) {
  return { products, total: products.length, skip: 0, limit: products.length };
}

describe('Importer transaction lifecycle and recovery (real PostgreSQL)', () => {
  const prisma = new PrismaService();
  const source = { fetchProducts: jest.fn() };
  const queue = {
    enqueueEmbedProduct: jest.fn<Promise<void>, [EmbedProductJobData]>(),
  };
  const cache = { invalidateCatalog: jest.fn() };
  let ingestion: IngestionService;
  let embeddingRepository: ProductEmbeddingRepository;
  let reviewWrites = 0;
  let failOnReviewWrite: number | undefined;

  beforeAll(async () => {
    await prisma.$connect();
    const instrumented = prisma.$extends({
      query: {
        productReview: {
          async createMany({ args, query }) {
            const result = await query(args);
            reviewWrites += 1;
            // Fail after all product/image/review SQL writes, before commit.
            if (reviewWrites === failOnReviewWrite)
              throw new Error('Injected product persistence failure');
            return result;
          },
        },
      },
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        IngestionService,
        ProductImportRepository,
        ProductEmbeddingRepository,
        { provide: PrismaService, useValue: instrumented },
        { provide: DummyJsonClient, useValue: source },
        { provide: QueueService, useValue: queue },
        { provide: CatalogCacheService, useValue: cache },
      ],
    }).compile();
    ingestion = moduleRef.get(IngestionService);
    embeddingRepository = moduleRef.get(ProductEmbeddingRepository);
  });

  async function cleanup() {
    const productFilter = {
      source: 'dummyjson',
      externalId: { in: ['970001', '970002', '970003'] },
    };
    await prisma.productImage.deleteMany({ where: { product: productFilter } });
    await prisma.productReview.deleteMany({
      where: { product: productFilter },
    });
    await prisma.product.deleteMany({
      where: {
        source: 'dummyjson',
        externalId: { in: ['970001', '970002', '970003'] },
      },
    });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: 'import-regression' } },
    });
  }

  beforeEach(async () => {
    await cleanup();
    reviewWrites = 0;
    failOnReviewWrite = undefined;
    source.fetchProducts.mockReset().mockResolvedValue(payload());
    cache.invalidateCatalog.mockReset().mockResolvedValue(undefined);
    queue.enqueueEmbedProduct.mockReset().mockImplementation(async (job) => {
      // A separate client read proves DB commit precedes queue publication.
      const persisted = await prisma.product.findUniqueOrThrow({
        where: { id: job.productId },
        include: { images: true, reviews: true },
      });
      expect(persisted.contentHash).toBe(job.contentHash);
      expect(persisted.images).toHaveLength(1);
      expect(persisted.reviews).toHaveLength(1);
    });
  });

  afterAll(async () => {
    try {
      await cleanup();
    } finally {
      await prisma.$disconnect();
    }
  });

  async function records() {
    return prisma.product.findMany({
      where: {
        externalId: { in: ['970001', '970002', '970003'] },
        source: 'dummyjson',
      },
      orderBy: { externalId: 'asc' },
      include: { images: true, reviews: true, category: true },
    });
  }

  async function completeEmbeddings() {
    for (const row of await records()) {
      await embeddingRepository.upsertEmbedding({
        productId: row.id,
        contentHash: row.contentHash,
        model: 'regression-test',
        vector: Array.from({ length: 768 }, (_, index) =>
          index === 0 ? 1 : 0,
        ),
      });
    }
  }

  it('persists deduplicated categories, products, images and reviews before enqueue', async () => {
    await expect(ingestion.bootstrapCatalog({ force: true })).resolves.toEqual({
      status: 'imported',
      summary: {
        received: 3,
        created: 3,
        updated: 0,
        unchanged: 0,
        sourceMissing: expect.any(Number),
      },
    });
    const rows = await records();
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.categoryId)).size).toBe(2);
    expect(
      rows.every(
        (row) =>
          row.images.length === 1 &&
          row.reviews.length === 1 &&
          row.contentHash.length === 64 &&
          row.sourceStatus === 'ACTIVE',
      ),
    ).toBe(true);
    expect(queue.enqueueEmbedProduct).toHaveBeenCalledTimes(3);
  });

  it('does not duplicate data or enqueue when unchanged embeddings are current', async () => {
    await ingestion.importProducts();
    await completeEmbeddings();
    const originalIds = (await records()).map((row) => row.id);
    queue.enqueueEmbedProduct.mockClear();
    await expect(ingestion.importProducts()).resolves.toEqual({
      received: 3,
      created: 0,
      updated: 0,
      unchanged: 3,
      sourceMissing: 0,
    });
    const rows = await records();
    expect(rows.map((row) => row.id)).toEqual(originalIds);
    expect(
      rows.every((row) => row.images.length === 1 && row.reviews.length === 1),
    ).toBe(true);
    expect(
      await prisma.category.count({
        where: { slug: { startsWith: 'import-regression' } },
      }),
    ).toBe(2);
    expect(queue.enqueueEmbedProduct).not.toHaveBeenCalled();
  });

  it('changes the hash and deterministic job ID only for changed embedding content', async () => {
    await ingestion.importProducts();
    await completeEmbeddings();
    const [before] = await records();
    const changed = payload();
    changed.products[0].description = 'Changed canonical embedding description';
    changed.products[0].images = ['https://example.com/replaced.jpg'];
    changed.products[0].reviews[0].comment = 'Replaced review';
    source.fetchProducts.mockResolvedValue(changed);
    queue.enqueueEmbedProduct.mockClear();
    await expect(ingestion.importProducts()).resolves.toMatchObject({
      created: 0,
      updated: 1,
      unchanged: 2,
    });
    const [after] = await records();
    expect(after.id).toBe(before.id);
    expect(after.contentHash).not.toBe(before.contentHash);
    expect(after.images.map((image) => image.url)).toEqual([
      'https://example.com/replaced.jpg',
    ]);
    expect(after.reviews.map((review) => review.comment)).toEqual([
      'Replaced review',
    ]);
    expect(queue.enqueueEmbedProduct).toHaveBeenCalledTimes(1);
    const job = { productId: after.id, contentHash: after.contentHash };
    expect(queue.enqueueEmbedProduct).toHaveBeenCalledWith(job);
    expect(embeddingJobId(job)).toBe(`embed:${after.id}:${after.contentHash}`);
  });

  it('marks absent products missing without deleting their relations', async () => {
    await ingestion.importProducts();
    source.fetchProducts.mockResolvedValue(
      payload([product(970001), product(970002)]),
    );
    await expect(ingestion.importProducts()).resolves.toMatchObject({
      unchanged: 2,
      sourceMissing: 1,
    });
    const rows = await records();
    expect(rows.map((row) => row.sourceStatus)).toEqual([
      'ACTIVE',
      'ACTIVE',
      'MISSING',
    ]);
    expect(rows[2].images).toHaveLength(1);
    expect(rows[2].reviews).toHaveLength(1);
  });

  it('replaces empty images/reviews without re-embedding unchanged content', async () => {
    await ingestion.importProducts();
    await completeEmbeddings();
    const changed = payload();
    changed.products[0].images = [];
    changed.products[0].reviews = [];
    source.fetchProducts.mockResolvedValue(changed);
    queue.enqueueEmbedProduct.mockClear();
    await expect(ingestion.importProducts()).resolves.toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 3,
    });
    const [row] = await records();
    expect(row.images).toEqual([]);
    expect(row.reviews).toEqual([]);
    expect(queue.enqueueEmbedProduct).not.toHaveBeenCalled();
  });

  it('repairs a stale embedding even when the source content hash is unchanged', async () => {
    await ingestion.importProducts();
    await completeEmbeddings();
    const [row] = await records();
    await embeddingRepository.upsertEmbedding({
      productId: row.id,
      contentHash: '0'.repeat(64),
      model: 'regression-test',
      vector: Array.from({ length: 768 }, (_, index) => (index === 0 ? 1 : 0)),
    });
    queue.enqueueEmbedProduct.mockClear();
    await expect(ingestion.importProducts()).resolves.toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 3,
    });
    expect(queue.enqueueEmbedProduct).toHaveBeenCalledTimes(1);
    expect(queue.enqueueEmbedProduct).toHaveBeenCalledWith({
      productId: row.id,
      contentHash: row.contentHash,
    });
  });

  it.each(['new', 'existing'])(
    'rolls back a failed %s product, preserves prior commits, then completes forced recovery',
    async (kind) => {
      source.fetchProducts.mockResolvedValue(
        payload(
          kind === 'existing'
            ? [product(970002), product(970003)]
            : [product(970003)],
        ),
      );
      await ingestion.importProducts();
      const previous = (await records()).find(
        (row) => row.externalId === '970002',
      );
      const next = payload([product(970001), product(970002)]);
      next.products[1].description = 'Version that must roll back on failure';
      next.products[1].reviews[0].comment =
        'Review that must roll back on failure';
      source.fetchProducts.mockResolvedValue(next);
      reviewWrites = 0;
      failOnReviewWrite = 2;
      queue.enqueueEmbedProduct.mockClear();
      await expect(ingestion.bootstrapCatalog({ force: true })).rejects.toThrow(
        'Injected product persistence failure',
      );
      const partial = await records();
      expect(
        partial.find((row) => row.externalId === '970001')?.reviews,
      ).toHaveLength(1);
      expect(partial.find((row) => row.externalId === '970002')).toEqual(
        previous,
      );
      expect(
        partial.find((row) => row.externalId === '970003')?.sourceStatus,
      ).toBe('ACTIVE');
      expect(queue.enqueueEmbedProduct).not.toHaveBeenCalled();
      await expect(ingestion.bootstrapCatalog()).resolves.toEqual({
        status: 'skipped',
      });

      failOnReviewWrite = undefined;
      await expect(
        ingestion.bootstrapCatalog({ force: true }),
      ).resolves.toMatchObject({
        status: 'imported',
        summary: {
          received: 2,
          created: kind === 'new' ? 1 : 0,
          updated: kind === 'existing' ? 1 : 0,
          unchanged: 1,
          sourceMissing: 1,
        },
      });
      const recovered = await records();
      expect(recovered).toHaveLength(3);
      expect(recovered[1].description).toBe(next.products[1].description);
      expect(recovered[1].reviews[0].comment).toBe(
        next.products[1].reviews[0].comment,
      );
      expect(recovered[2].sourceStatus).toBe('MISSING');
      expect(
        await prisma.category.count({
          where: { slug: { startsWith: 'import-regression' } },
        }),
      ).toBe(2);
      // The first committed product had no embedding: retry must recover its work too.
      expect(queue.enqueueEmbedProduct).toHaveBeenCalledTimes(2);
    },
  );

  it('recovers missing embedding work after queue publication fails following commit', async () => {
    queue.enqueueEmbedProduct.mockRejectedValueOnce(
      new Error('Queue unavailable'),
    );
    await expect(ingestion.bootstrapCatalog({ force: true })).rejects.toThrow(
      'Queue unavailable',
    );
    expect(await records()).toHaveLength(3);
    queue.enqueueEmbedProduct.mockClear();
    await expect(
      ingestion.bootstrapCatalog({ force: true }),
    ).resolves.toMatchObject({
      summary: { created: 0, updated: 0, unchanged: 3 },
    });
    expect(queue.enqueueEmbedProduct).toHaveBeenCalledTimes(3);
  });
});
