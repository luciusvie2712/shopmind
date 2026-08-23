import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import { AiRequestLogService } from '../src/modules/ai/ai-request-log.service';
import {
  EMBEDDING_PROVIDER,
  type EmbeddingProvider,
} from '../src/modules/ai/embedding/embedding-provider';
import {
  AI_SEARCH_PROVIDER,
  AiProviderTimeoutError,
  type AiSearchProvider,
} from '../src/modules/ai/provider/ai-provider';
import { ProductEmbeddingRepository } from '../src/modules/ingestion/product-embedding.repository';

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

function unitVector(): number[] {
  return Array.from({ length: 768 }, (_, index) => (index === 0 ? 1 : 0));
}

const baseIntent = {
  category: 'phase-eight-laptops',
  price: { max: 1_000 },
  brands: ['Required Brand'],
  minRating: 4,
  useCases: ['backend development'],
  requiredFeatures: ['Docker'],
  priorities: ['portability'],
  negativePreferences: ['gaming-first'],
  semanticQuery: 'Docker laptop',
};

describe('Phase 8 AI search integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let embeddings: ProductEmbeddingRepository;
  let logs: AiRequestLogService;
  const extractSearchIntent = jest.fn();
  const generateGroundedRecommendation = jest.fn();
  const aiProvider: AiSearchProvider = {
    extractSearchIntent,
    generateGroundedRecommendation,
  };
  const embeddingProvider: EmbeddingProvider = {
    embedText: jest.fn(async () => unitVector()),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AI_SEARCH_PROVIDER)
      .useValue(aiProvider)
      .overrideProvider(EMBEDDING_PROVIDER)
      .useValue(embeddingProvider)
      .compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
    embeddings = app.get(ProductEmbeddingRepository);
    logs = app.get(AiRequestLogService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    extractSearchIntent.mockResolvedValue(baseIntent);
    generateGroundedRecommendation.mockImplementation(
      async (input: { candidates: readonly { id: string }[] }) => ({
        recommendations: [
          {
            productId: input.candidates[0].id,
            reason: 'Grounded from allowed canonical candidate',
            tradeoffs: ['Verify inferred suitability'],
          },
        ],
      }),
    );
    await cleanup();
  });

  afterAll(async () => {
    if (prisma !== undefined) await cleanup();
    if (app !== undefined) await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.aiRequestLog.deleteMany({
      where: { model: 'phase8-test-model' },
    });
    await prisma.product.deleteMany({ where: { source: 'phase8-test' } });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: 'phase-eight-' } },
    });
  }

  async function createProduct(input: {
    externalId: string;
    categoryId: string;
    title?: string;
    description?: string;
    brand?: string;
    price?: number;
    rating?: number;
    stock?: number;
  }): Promise<string> {
    const product = await prisma.product.create({
      data: {
        source: 'phase8-test',
        externalId: input.externalId,
        categoryId: input.categoryId,
        title: input.title ?? 'Docker laptop',
        description: input.description ?? 'Portable Docker development laptop',
        brand: input.brand ?? 'Required Brand',
        price: input.price ?? 999,
        rating: input.rating ?? 4.8,
        stock: input.stock ?? 5,
        thumbnail: null,
        metadata: {},
        contentHash: input.externalId.padEnd(64, '0').slice(0, 64),
        sourceStatus: 'ACTIVE',
      },
    });
    await embeddings.upsertEmbedding({
      productId: product.id,
      vector: unitVector(),
      model: 'phase8-test-embedding',
      contentHash: product.contentHash,
    });
    return product.id;
  }

  async function seedHardConstraintFixture(): Promise<string> {
    const laptops = await prisma.category.create({
      data: { slug: 'phase-eight-laptops', name: 'Phase Eight Laptops' },
    });
    const phones = await prisma.category.create({
      data: { slug: 'phase-eight-phones', name: 'Phase Eight Phones' },
    });
    const validId = await createProduct({
      externalId: 'valid',
      categoryId: laptops.id,
    });
    await Promise.all([
      createProduct({
        externalId: 'over-budget',
        categoryId: laptops.id,
        price: 1_200,
      }),
      createProduct({
        externalId: 'wrong-category',
        categoryId: phones.id,
      }),
      createProduct({
        externalId: 'wrong-brand',
        categoryId: laptops.id,
        brand: 'Other Brand',
      }),
      createProduct({
        externalId: 'low-rating',
        categoryId: laptops.id,
        rating: 3,
      }),
      createProduct({
        externalId: 'out-of-stock',
        categoryId: laptops.id,
        stock: 0,
      }),
      createProduct({
        externalId: 'missing-feature',
        categoryId: laptops.id,
        title: 'General-purpose laptop',
        description: 'Portable general-purpose laptop',
      }),
    ]);
    return validId;
  }

  it('enforces hard constraints and returns only canonical allowlisted facts', async () => {
    const validId = await seedHardConstraintFixture();
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/search')
      .set('x-request-id', 'phase8-request')
      .send({ query: 'Docker laptop under $1000' })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'success',
      requestId: 'phase8-request',
      results: [
        {
          product: {
            id: validId,
            title: 'Docker laptop',
            price: 999,
            rating: 4.8,
            stock: 5,
          },
          reason: 'Grounded from allowed canonical candidate',
        },
      ],
    });
    expect(generateGroundedRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        candidates: [expect.objectContaining({ id: validId, price: 999 })],
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('embedding');
  });

  it('rejects invalid DTO values with the stable envelope', async () => {
    for (const payload of [
      { query: 'x' },
      { query: 'x'.repeat(501) },
      { query: 'valid query', limit: 0 },
      { query: 'valid query', limit: 21 },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/search')
        .send(payload)
        .expect(400);
      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        requestId: expect.any(String),
      });
    }
  });

  it('returns fallback products without invented IDs or explanations', async () => {
    const validId = await seedHardConstraintFixture();
    generateGroundedRecommendation.mockResolvedValue({
      recommendations: [
        {
          productId: '00000000-0000-4000-8000-000000000099',
          reason: 'Invented',
          tradeoffs: [],
        },
      ],
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/search')
      .send({ query: 'Docker laptop under $1000' })
      .expect(201);
    expect(response.body).toMatchObject({
      status: 'fallback',
      fallback: { stage: 'recommendation', reason: 'AI_INVALID_OUTPUT' },
      results: [{ product: { id: validId } }],
    });
    expect(response.body.results[0]).not.toHaveProperty('reason');
    expect(JSON.stringify(response.body)).not.toContain('000000000099');
  });

  it('uses deterministic fallback on intent timeout and handles no hard match', async () => {
    const validId = await seedHardConstraintFixture();
    extractSearchIntent.mockRejectedValueOnce(new AiProviderTimeoutError());
    const fallback = await request(app.getHttpServer())
      .post('/api/v1/ai/search')
      .send({ query: 'Docker laptop' })
      .expect(201);
    expect(fallback.body).toMatchObject({
      status: 'fallback',
      fallback: { stage: 'intent', reason: 'AI_PROVIDER_TIMEOUT' },
    });
    expect(
      fallback.body.results.some(
        (result: { product: { id: string } }) => result.product.id === validId,
      ),
    ).toBe(true);
    expect(generateGroundedRecommendation).not.toHaveBeenCalled();

    extractSearchIntent.mockResolvedValue({
      ...baseIntent,
      price: { max: 1 },
    });
    const noMatch = await request(app.getHttpServer())
      .post('/api/v1/ai/search')
      .send({ query: 'Impossible budget laptop' })
      .expect(201);
    expect(noMatch.body).toMatchObject({
      status: 'no_hard_match',
      results: [],
    });
  });

  it('persists typed AI operation telemetry without prompt or secret fields', async () => {
    await logs.record({
      operation: 'search_intent',
      model: 'phase8-test-model',
      inputTokens: 12,
      outputTokens: 8,
      latencyMs: 42.5,
      status: 'success',
    });
    const row = await prisma.aiRequestLog.findFirstOrThrow({
      where: { model: 'phase8-test-model' },
    });
    expect(row).toMatchObject({
      userId: null,
      operation: 'search_intent',
      inputTokens: 12,
      outputTokens: 8,
      latencyMs: 42.5,
      status: 'success',
    });
    expect(Object.keys(row)).not.toEqual(
      expect.arrayContaining(['prompt', 'response', 'apiKey', 'secret']),
    );
  });
});
