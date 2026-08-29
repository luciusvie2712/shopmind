import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import { queueConnectionOptions } from '../src/common/queue/queue.connection';
import {
  type EmbedProductJobData,
  embeddingJobId,
  JOB_NAMES,
  QUEUE_NAMES,
  type SyncProductsJobData,
} from '../src/common/queue/queue.constants';
import { QueueService } from '../src/common/queue/queue.service';
import {
  EMBEDDING_PROVIDER,
  type EmbeddingProvider,
  EmbeddingProviderTimeoutError,
} from '../src/modules/ai/embedding/embedding-provider';
import { DummyJsonClient } from '../src/modules/ingestion/dummy-json.client';
import { EmbedProductProcessor } from '../src/modules/ingestion/embed-product.processor';
import { IngestionService } from '../src/modules/ingestion/ingestion.service';
import { ProductEmbeddingRepository } from '../src/modules/ingestion/product-embedding.repository';
import { SyncProductsProcessor } from '../src/modules/ingestion/sync-products.processor';
import { VectorSearchRepository } from '../src/modules/search/vector-search.repository';

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

function unitVector(index: number): number[] {
  return Array.from({ length: 768 }, (_, item) => (item === index ? 1 : 0));
}

function payload(description = 'Portable Docker development laptop') {
  return {
    products: [
      {
        id: 960001,
        title: 'Phase Six Laptop',
        description,
        category: 'phase-six-laptops',
        price: 899,
        rating: 4.8,
        stock: 8,
        brand: 'ShopMind Semantic',
        tags: ['docker', 'development'],
        thumbnail: 'https://example.com/phase6-laptop.jpg',
        images: [],
        reviews: [],
      },
      {
        id: 960002,
        title: 'Phase Six Phone',
        description: 'Compact communication device',
        category: 'phase-six-phones',
        price: 299,
        rating: 4.5,
        stock: 0,
        brand: 'ShopMind Semantic',
        tags: ['mobile'],
        thumbnail: 'https://example.com/phase6-phone.jpg',
        images: [],
        reviews: [],
      },
    ],
    total: 2,
    skip: 0,
    limit: 2,
  };
}

describe('Phase 6 semantic integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let queueService: QueueService;
  let ingestionService: IngestionService;
  let embeddingRepository: ProductEmbeddingRepository;
  let vectorRepository: VectorSearchRepository;
  let ingestionQueue: Queue<SyncProductsJobData>;
  let embeddingQueue: Queue<EmbedProductJobData>;
  let ingestionEvents: QueueEvents;
  let embeddingEvents: QueueEvents;
  let ingestionWorker: Worker<SyncProductsJobData>;
  let embeddingWorker: Worker<EmbedProductJobData>;
  let embedProcessor: EmbedProductProcessor;
  const createdJobs: Array<{ queue: Queue; id: string }> = [];
  const dummyJsonClient = { fetchProducts: jest.fn() };
  const embeddingProvider: EmbeddingProvider = {
    embedText: jest.fn(async (text: string) =>
      text.toLowerCase().includes('phone') ? unitVector(1) : unitVector(0),
    ),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DummyJsonClient)
      .useValue(dummyJsonClient)
      .overrideProvider(EMBEDDING_PROVIDER)
      .useValue(embeddingProvider)
      .compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
    queueService = app.get(QueueService);
    ingestionService = app.get(IngestionService);
    embeddingRepository = app.get(ProductEmbeddingRepository);
    vectorRepository = app.get(VectorSearchRepository);

    const connection = queueConnectionOptions();
    ingestionQueue = new Queue(QUEUE_NAMES.ingestion, { connection });
    embeddingQueue = new Queue(QUEUE_NAMES.embedding, { connection });
    ingestionEvents = new QueueEvents(QUEUE_NAMES.ingestion, { connection });
    embeddingEvents = new QueueEvents(QUEUE_NAMES.embedding, { connection });
    await Promise.all([
      ingestionEvents.waitUntilReady(),
      embeddingEvents.waitUntilReady(),
    ]);
    const syncProcessor = app.get(SyncProductsProcessor);
    embedProcessor = app.get(EmbedProductProcessor);
    ingestionWorker = new Worker(
      QUEUE_NAMES.ingestion,
      async (job) => {
        if (job.name !== JOB_NAMES.syncProducts) {
          throw new Error(`Unsupported ingestion job: ${job.name}`);
        }
        await syncProcessor.process(job);
      },
      { connection, concurrency: 1 },
    );
    embeddingWorker = new Worker(
      QUEUE_NAMES.embedding,
      async (job) => {
        if (job.name !== JOB_NAMES.embedProduct) {
          throw new Error(`Unsupported embedding job: ${job.name}`);
        }
        await embedProcessor.process(job);
      },
      { connection, concurrency: 1 },
    );
    await Promise.all([
      ingestionWorker.waitUntilReady(),
      embeddingWorker.waitUntilReady(),
    ]);
  });

  beforeEach(async () => {
    dummyJsonClient.fetchProducts.mockReset();
    dummyJsonClient.fetchProducts.mockResolvedValue(payload());
    jest.mocked(embeddingProvider.embedText).mockClear();
    await cleanupDatabase();
  });

  afterEach(async () => {
    const products = await prisma.product.findMany({
      where: {
        source: 'dummyjson',
        externalId: { in: ['960001', '960002'] },
      },
      select: { id: true, contentHash: true },
    });
    for (const product of products) {
      const id = embeddingJobId({
        productId: product.id,
        contentHash: product.contentHash,
      });
      const job = await embeddingQueue.getJob(id);
      if (job !== undefined) await job.remove();
    }
    for (const { queue, id } of createdJobs.splice(0)) {
      const job = await queue.getJob(id);
      if (job !== undefined) await job.remove();
    }
  });

  afterAll(async () => {
    await Promise.all([ingestionWorker.close(), embeddingWorker.close()]);
    await Promise.all([ingestionEvents.close(), embeddingEvents.close()]);
    await Promise.all([ingestionQueue.close(), embeddingQueue.close()]);
    if (prisma !== undefined) await cleanupDatabase();
    if (app !== undefined) await app.close();
  });

  async function cleanupDatabase(): Promise<void> {
    await prisma.product.deleteMany({
      where: {
        source: 'dummyjson',
        externalId: { in: ['960001', '960002'] },
      },
    });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: 'phase-six-' } },
    });
  }

  async function completed<T>(
    queue: Queue<T>,
    events: QueueEvents,
    id: string,
  ): Promise<Job<T>> {
    const job = await queue.getJob(id);
    if (job === undefined) throw new Error(`Expected queued job ${id}`);
    createdJobs.push({ queue, id });
    await job.waitUntilFinished(events, 15_000);
    return job;
  }

  async function importAndCompleteEmbeddings() {
    await ingestionService.importProducts();
    const products = await prisma.product.findMany({
      where: { source: 'dummyjson', externalId: { in: ['960001', '960002'] } },
      orderBy: { externalId: 'asc' },
    });
    for (const product of products) {
      await completed(
        embeddingQueue,
        embeddingEvents,
        embeddingJobId({
          productId: product.id,
          contentHash: product.contentHash,
        }),
      );
    }
    return products;
  }

  it('skips provider work when a completed job was removed and the same version is enqueued again', async () => {
    const [product] = await importAndCompleteEmbeddings();
    const data = { productId: product.id, contentHash: product.contentHash };
    const id = embeddingJobId(data);
    const original = await embeddingQueue.getJob(id);
    if (original === undefined)
      throw new Error('Expected completed embedding job');
    const before = await prisma.productEmbedding.findUniqueOrThrow({
      where: { productId: product.id },
      select: { contentHash: true, updatedAt: true },
    });
    const providerCalls = jest.mocked(embeddingProvider.embedText).mock.calls
      .length;
    await original.remove();
    await queueService.enqueueEmbedProduct(data);
    await queueService.enqueueEmbedProduct(data);
    await completed(embeddingQueue, embeddingEvents, id);
    expect(jest.mocked(embeddingProvider.embedText)).toHaveBeenCalledTimes(
      providerCalls,
    );
    expect(
      await prisma.productEmbedding.findUniqueOrThrow({
        where: { productId: product.id },
        select: { contentHash: true, updatedAt: true },
      }),
    ).toEqual(before);
  });

  it.each(['changed', 'missing'])(
    'rejects a late provider result after its canonical product becomes %s',
    async (state) => {
      const [product] = await importAndCompleteEmbeddings();
      const oldJob = await embeddingQueue.getJob(
        embeddingJobId({
          productId: product.id,
          contentHash: product.contentHash,
        }),
      );
      if (oldJob === undefined)
        throw new Error('Expected original embedding job');
      await prisma.productEmbedding.delete({
        where: { productId: product.id },
      });

      const provider = {
        embedText: jest.fn(async () => {
          const next = payload(
            'Updated while the old provider request is pending',
          );
          if (state === 'missing') {
            next.products = next.products.slice(1);
            next.total = 1;
            next.limit = 1;
          }
          dummyJsonClient.fetchProducts.mockResolvedValue(next);
          await ingestionService.importProducts();
          if (state === 'changed') {
            const current = await prisma.product.findUniqueOrThrow({
              where: { id: product.id },
            });
            await completed(
              embeddingQueue,
              embeddingEvents,
              embeddingJobId({
                productId: current.id,
                contentHash: current.contentHash,
              }),
            );
          }
          return unitVector(1);
        }),
      };
      const delayedProcessor = new EmbedProductProcessor(
        embeddingRepository,
        provider,
      );
      await expect(delayedProcessor.process(oldJob)).resolves.toBe('stale');
      expect(provider.embedText).toHaveBeenCalledTimes(1);
      const current = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { embedding: { select: { contentHash: true } } },
      });
      if (state === 'changed') {
        expect(current.contentHash).not.toBe(product.contentHash);
        expect(current.embedding?.contentHash).toBe(current.contentHash);
        const rows = await prisma.$queryRaw<Array<{ similarity: number }>>`
        SELECT 1 - (embedding <=> ${`[${unitVector(0).join(',')}]`}::vector) AS similarity
        FROM product_embeddings WHERE product_id = ${product.id}::uuid
      `;
        expect(rows[0].similarity).toBe(1);
      } else {
        expect(current.sourceStatus).toBe('MISSING');
        expect(current.embedding).toBeNull();
      }
    },
  );

  it('processes BullMQ sync and idempotent embedding jobs from canonical data', async () => {
    const sync = await queueService.enqueueSyncProducts();
    await completed(ingestionQueue, ingestionEvents, sync.jobId);

    const products = await prisma.product.findMany({
      where: { externalId: { in: ['960001', '960002'] } },
      orderBy: { externalId: 'asc' },
    });
    expect(products).toHaveLength(2);
    const initialLaptopHash = products[0].contentHash;
    for (const product of products) {
      const id = embeddingJobId({
        productId: product.id,
        contentHash: product.contentHash,
      });
      const job = await completed(embeddingQueue, embeddingEvents, id);
      expect(job.opts).toMatchObject({
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
      });
    }

    const rows = await prisma.$queryRaw<
      Array<{ dimensions: number; model: string; contentHash: string }>
    >`
      SELECT
        vector_dims(embedding)::int AS dimensions,
        model,
        content_hash AS "contentHash"
      FROM product_embeddings
      ORDER BY product_id
    `;
    expect(rows).toHaveLength(2);
    expect(rows.every(({ dimensions }) => dimensions === 768)).toBe(true);

    const providerCallsBeforeDuplicate = jest.mocked(
      embeddingProvider.embedText,
    ).mock.calls.length;
    const duplicateData = {
      productId: products[0].id,
      contentHash: products[0].contentHash,
    };
    await queueService.enqueueEmbedProduct(duplicateData);
    await queueService.enqueueEmbedProduct(duplicateData);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(jest.mocked(embeddingProvider.embedText)).toHaveBeenCalledTimes(
      providerCallsBeforeDuplicate,
    );

    const enqueueSpy = jest.spyOn(queueService, 'enqueueEmbedProduct');
    enqueueSpy.mockClear();
    await ingestionService.importProducts();
    expect(enqueueSpy).not.toHaveBeenCalled();

    dummyJsonClient.fetchProducts.mockResolvedValue(
      payload('Changed canonical Docker development laptop'),
    );
    await ingestionService.importProducts();
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const changed = await prisma.product.findUniqueOrThrow({
      where: {
        source_externalId: { source: 'dummyjson', externalId: '960001' },
      },
    });
    const changedId = embeddingJobId({
      productId: changed.id,
      contentHash: changed.contentHash,
    });
    await completed(embeddingQueue, embeddingEvents, changedId);
    enqueueSpy.mockRestore();
    expect(jest.mocked(embeddingProvider.embedText)).toHaveBeenCalledWith(
      expect.stringContaining('Changed canonical Docker development laptop'),
    );
    const providerCalls = jest.mocked(embeddingProvider.embedText).mock.calls
      .length;
    await expect(
      embedProcessor.process({
        id: 'stale-job',
        name: JOB_NAMES.embedProduct,
        attemptsMade: 0,
        data: { productId: changed.id, contentHash: initialLaptopHash },
      } as Job<EmbedProductJobData>),
    ).resolves.toBe('stale');
    expect(jest.mocked(embeddingProvider.embedText)).toHaveBeenCalledTimes(
      providerCalls,
    );
    const stored = await prisma.$queryRaw<Array<{ contentHash: string }>>`
      SELECT content_hash AS "contentHash"
      FROM product_embeddings
      WHERE product_id = ${changed.id}::uuid
    `;
    expect(stored[0]?.contentHash).toBe(changed.contentHash);

    const failedId = `phase6-unknown-${Date.now()}`;
    const failed = await embeddingQueue.add(
      'UNKNOWN_JOB',
      { productId: changed.id, contentHash: changed.contentHash },
      { jobId: failedId, removeOnFail: false },
    );
    createdJobs.push({ queue: embeddingQueue, id: failedId });
    await expect(
      failed.waitUntilFinished(embeddingEvents, 10_000),
    ).rejects.toThrow('Unsupported embedding job');
    expect(await failed.getState()).toBe('failed');
    expect(await embeddingQueue.getJob(failedId)).toBeDefined();
  });

  it('persists VECTOR(768) and applies cosine, stock, category, price, and limit filters', async () => {
    await ingestionService.importProducts();
    const products = await prisma.product.findMany({
      where: { externalId: { in: ['960001', '960002'] } },
      orderBy: { externalId: 'asc' },
    });
    await embeddingRepository.upsertEmbedding({
      productId: products[0].id,
      vector: unitVector(0),
      model: 'phase6-test-model',
      contentHash: products[0].contentHash,
    });
    await embeddingRepository.upsertEmbedding({
      productId: products[1].id,
      vector: unitVector(1),
      model: 'phase6-test-model',
      contentHash: products[1].contentHash,
    });

    const results = await vectorRepository.search({
      embedding: unitVector(0),
      limit: 1,
      category: 'phase-six-laptops',
      minPrice: 800,
      maxPrice: 900,
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      product: { title: 'Phase Six Laptop', stock: 8 },
      semanticSimilarity: 1,
    });
  });

  it('returns bounded canonical semantic candidates without embeddings or explanations', async () => {
    await ingestionService.importProducts();
    const product = await prisma.product.findUniqueOrThrow({
      where: {
        source_externalId: { source: 'dummyjson', externalId: '960001' },
      },
    });
    await embeddingRepository.upsertEmbedding({
      productId: product.id,
      vector: unitVector(0),
      model: 'phase6-test-model',
      contentHash: product.contentHash,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/search/semantic')
      .send({ query: 'Docker development laptop', limit: 5 })
      .expect(201);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      product: { id: product.id, title: product.title, price: 899, stock: 8 },
      semanticSimilarity: 1,
    });
    expect(JSON.stringify(response.body)).not.toContain('embedding');
    expect(response.body.items[0]).not.toHaveProperty('reason');

    jest.mocked(embeddingProvider.embedText).mockImplementation(async (text) => {
      if (text === 'Provider timeout query')
        throw new EmbeddingProviderTimeoutError();
      return text.toLowerCase().includes('phone')
        ? unitVector(1)
        : unitVector(0);
    });
    const timeout = await request(app.getHttpServer())
      .post('/api/v1/search/semantic')
      .send({ query: 'Provider timeout query' })
      .expect(504);
    expect(timeout.body.error).toMatchObject({
      code: 'AI_PROVIDER_TIMEOUT',
      requestId: expect.any(String),
    });

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/search/semantic')
      .send({ query: 'x', limit: 21 })
      .expect(400);
    expect(invalid.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: expect.any(String),
    });
  });
});
