import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import { AccessTokenService } from '../src/modules/auth/services/access-token.service';
import {
  AI_SEARCH_PROVIDER,
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  type AiProvider,
} from '../src/modules/ai/provider/ai-provider';

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

describe('Phase 9 assistant and compare integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessTokens: AccessTokenService;
  let firstUserId: string;
  let secondUserId: string;
  let firstToken: string;
  let secondToken: string;
  let productIds: string[];

  const extractSearchIntent = jest.fn();
  const generateGroundedRecommendation = jest.fn();
  const compareProducts = jest.fn();
  const chatWithTools = jest.fn();
  const summarizeReviews = jest.fn();
  const aiProvider: AiProvider = {
    extractSearchIntent,
    generateGroundedRecommendation,
    compareProducts,
    chatWithTools,
    summarizeReviews,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AI_SEARCH_PROVIDER)
      .useValue(aiProvider)
      .compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
    accessTokens = app.get(AccessTokenService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanup();
    const [firstUser, secondUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: 'first@phase9.test',
          passwordHash: 'not-used-by-this-test',
          name: 'Phase Nine First',
        },
      }),
      prisma.user.create({
        data: {
          email: 'second@phase9.test',
          passwordHash: 'not-used-by-this-test',
          name: 'Phase Nine Second',
        },
      }),
    ]);
    firstUserId = firstUser.id;
    secondUserId = secondUser.id;
    [firstToken, secondToken] = await Promise.all([
      accessTokens.sign({ id: firstUserId, role: Role.USER }),
      accessTokens.sign({ id: secondUserId, role: Role.USER }),
    ]);
    productIds = await seedProducts();
  });

  afterAll(async () => {
    if (prisma !== undefined) await cleanup();
    if (app !== undefined) await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.aiRequestLog.deleteMany({
      where: { user: { email: { endsWith: '@phase9.test' } } },
    });
    await prisma.aiConversation.deleteMany({
      where: { user: { email: { endsWith: '@phase9.test' } } },
    });
    await prisma.product.deleteMany({ where: { source: 'phase9-test' } });
    await prisma.category.deleteMany({
      where: { slug: 'phase-nine-products' },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@phase9.test' } },
    });
  }

  async function seedProducts(): Promise<string[]> {
    const category = await prisma.category.create({
      data: { slug: 'phase-nine-products', name: 'Phase Nine Products' },
    });
    const products = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        prisma.product.create({
          data: {
            source: 'phase9-test',
            externalId: `phase9-${index + 1}`,
            categoryId: category.id,
            title: `Canonical Product ${index + 1}`,
            description: `Canonical description ${index + 1}`,
            brand: 'ShopMind Test',
            price: 100 + index,
            rating: 4.5,
            stock: 10,
            metadata: { color: index % 2 === 0 ? 'black' : 'white' },
            contentHash: String(index + 1).padEnd(64, '0'),
          },
        }),
      ),
    );
    return products.map((product) => product.id);
  }

  it('requires authentication and validates assistant input', async () => {
    const unauthenticated = await request(app.getHttpServer())
      .post('/api/v1/ai/assistant/messages')
      .send({ message: 'Show me a product' })
      .expect(401);
    expect(unauthenticated.body.error).toMatchObject({
      code: 'AUTH_REQUIRED',
      requestId: expect.any(String),
    });

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/ai/assistant/messages')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ message: '' })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('persists an owned conversation and returns only canonical tool facts', async () => {
    chatWithTools
      .mockResolvedValueOnce({
        kind: 'tool_calls',
        calls: [
          {
            id: 'tool-1',
            name: 'get_product',
            args: { productId: productIds[0] },
          },
        ],
      })
      .mockResolvedValueOnce({
        kind: 'final',
        output: {
          message: 'This canonical product matches your request.',
          referencedProductIds: [productIds[0]],
        },
      });

    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/assistant/messages')
      .set('Authorization', `Bearer ${firstToken}`)
      .set('x-request-id', 'phase9-assistant-request')
      .send({ message: 'Tell me about the first product' })
      .expect(201);

    expect(response.body).toMatchObject({
      conversationId: expect.any(String),
      message: {
        role: 'ASSISTANT',
        content: 'This canonical product matches your request.',
        createdAt: expect.any(String),
      },
      products: [
        {
          id: productIds[0],
          title: 'Canonical Product 1',
          price: 100,
          stock: 10,
        },
      ],
      requestId: 'phase9-assistant-request',
    });
    const conversation = await prisma.aiConversation.findUniqueOrThrow({
      where: { id: String(response.body.conversationId) },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    expect(conversation.userId).toBe(firstUserId);
    expect(
      conversation.messages.map(({ role, content }) => ({ role, content })),
    ).toEqual([
      { role: 'USER', content: 'Tell me about the first product' },
      {
        role: 'ASSISTANT',
        content: 'This canonical product matches your request.',
      },
    ]);
    expect(conversation.updatedAt.getTime()).toBeGreaterThanOrEqual(
      conversation.createdAt.getTime(),
    );

    await request(app.getHttpServer())
      .post('/api/v1/ai/assistant/messages')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({
        conversationId: conversation.id,
        message: 'Attempt cross-user access',
      })
      .expect(403);
  });

  it('rejects an ungrounded assistant product and stores no assistant reply', async () => {
    chatWithTools.mockResolvedValue({
      kind: 'final',
      output: {
        message: 'Invented product',
        referencedProductIds: ['00000000-0000-4000-8000-000000000099'],
      },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/assistant/messages')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ message: 'Invent something' })
      .expect(502);
    expect(response.body.error.code).toBe('AI_INVALID_OUTPUT');
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: firstUserId },
      include: { messages: true },
    });
    expect(conversations).toHaveLength(1);
    expect(conversations[0].messages).toHaveLength(1);
    expect(conversations[0].messages[0].role).toBe('USER');
  });

  it('rejects model-requested write tools before any commerce mutation', async () => {
    chatWithTools.mockResolvedValue({
      kind: 'tool_calls',
      calls: [
        {
          id: 'unsafe-tool-call',
          name: 'checkout',
          args: {},
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/assistant/messages')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ message: 'Checkout for me' })
      .expect(502);

    expect(response.body.error.code).toBe('AI_INVALID_OUTPUT');
    expect(await prisma.order.count({ where: { userId: firstUserId } })).toBe(0);
    expect(await prisma.cartItem.count()).toBe(0);
    expect(await prisma.wishlistItem.count()).toBe(0);
  });

  it.each([2, 4])(
    'compares %i products using canonical database facts',
    async (count) => {
      const selectedIds = productIds.slice(0, count);
      compareProducts.mockImplementation(
        async (input: { products: readonly { id: string }[] }) => ({
          summary: 'Grounded comparison summary',
          referencedProductIds: input.products.map((product) => product.id),
        }),
      );
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/compare')
        .send({ productIds: selectedIds })
        .expect(201);
      expect(response.body).toMatchObject({
        status: 'success',
        summary: 'Grounded comparison summary',
        referencedProductIds: selectedIds,
      });
      expect(response.body.products).toHaveLength(count);
      expect(response.body.products[0]).toMatchObject({
        id: productIds[0],
        title: 'Canonical Product 1',
        price: 100,
      });
    },
  );

  it('validates compare IDs and rejects a missing canonical product', async () => {
    for (const productIdsInput of [
      [productIds[0]],
      [...productIds, '00000000-0000-4000-8000-000000000010'],
      [productIds[0], productIds[0]],
      [productIds[0], 'not-a-uuid'],
    ]) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/compare')
        .send({ productIds: productIdsInput })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }

    const missing = await request(app.getHttpServer())
      .post('/api/v1/ai/compare')
      .send({
        productIds: [productIds[0], '00000000-0000-4000-8000-000000000099'],
      })
      .expect(404);
    expect(missing.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it.each([
    [new AiProviderTimeoutError(), 'AI_PROVIDER_TIMEOUT'],
    [new AiProviderInvalidOutputError(), 'AI_INVALID_OUTPUT'],
  ])('keeps canonical compare facts when AI fails', async (error, reason) => {
    compareProducts.mockRejectedValue(error);
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/compare')
      .send({ productIds: productIds.slice(0, 2) })
      .expect(201);
    expect(response.body).toMatchObject({
      status: 'fallback',
      fallbackReason: reason,
      referencedProductIds: [],
      products: [
        { id: productIds[0], price: 100 },
        { id: productIds[1], price: 101 },
      ],
    });
    expect(response.body).not.toHaveProperty('summary');
  });
});
