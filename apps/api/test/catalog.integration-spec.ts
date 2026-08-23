import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  buildProductListCacheKey,
  CATALOG_CACHE_KEYS,
  CatalogCacheService,
} from '../src/common/cache/catalog-cache.service';
import { PrismaService } from '../src/common/database/prisma.service';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import { QueueService } from '../src/common/queue/queue.service';
import { RedisService } from '../src/common/redis/redis.service';
import { DummyJsonClient } from '../src/modules/ingestion/dummy-json.client';
import { IngestionService } from '../src/modules/ingestion/ingestion.service';

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

function catalogPayload(): Record<string, unknown> {
  return {
    products: [
      {
        id: 900001,
        title: 'Phase Three Laptop',
        description: 'Portable development laptop',
        category: 'laptops',
        price: 999.99,
        rating: 4.5,
        stock: 12,
        brand: 'ShopMind Test',
        tags: ['development', 'portable'],
        thumbnail: 'https://example.com/products/900001/thumb.jpg',
        images: ['https://example.com/products/900001/image.jpg'],
        reviews: [
          {
            rating: 5,
            comment: 'Excellent fixture',
            date: '2026-01-01T00:00:00.000Z',
            reviewerName: 'Catalog Reviewer',
          },
        ],
      },
      {
        id: 900002,
        title: 'Phase Three Phone',
        description: 'Compact fixture phone',
        category: 'smartphones',
        price: 299.5,
        rating: 4.8,
        stock: 5,
        brand: 'Other Brand',
        tags: ['mobile'],
        thumbnail: 'https://example.com/products/900002/thumb.jpg',
        images: [],
        reviews: [],
      },
    ],
    total: 2,
    skip: 0,
    limit: 2,
  };
}

describe('Phase 3 catalog integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let cache: CatalogCacheService;
  let ingestion: IngestionService;
  const dummyJsonClient = { fetchProducts: jest.fn<Promise<unknown>, []>() };
  const queueService = {
    enqueueSyncProducts: jest
      .fn()
      .mockResolvedValue({ jobId: 'sync-products-test' }),
    enqueueEmbedProduct: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DummyJsonClient)
      .useValue(dummyJsonClient)
      .overrideProvider(QueueService)
      .useValue(queueService)
      .compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    cache = app.get(CatalogCacheService);
    ingestion = app.get(IngestionService);
  });

  beforeEach(async () => {
    dummyJsonClient.fetchProducts.mockReset();
    dummyJsonClient.fetchProducts.mockResolvedValue(catalogPayload());
    queueService.enqueueSyncProducts.mockClear();
    queueService.enqueueEmbedProduct.mockClear();
    await prisma.refreshSession.deleteMany({
      where: { user: { email: { endsWith: '@phase3.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@phase3.test' } },
    });
    await prisma.productReview.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany({ where: { source: 'dummyjson' } });
    await prisma.category.deleteMany();
    await cache.invalidateCatalog([]);
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  async function accessTokenFor(email: string, role: Role): Promise<string> {
    const credentials = {
      name: 'Phase Three User',
      email,
      password: 'phase-three-password',
    };
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);
    if (role === Role.ADMIN) {
      await prisma.user.update({ where: { email }, data: { role } });
    }
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: credentials.password })
      .expect(200);
    const token: unknown = login.body.accessToken;
    if (typeof token !== 'string') {
      throw new Error('Access token was not returned');
    }
    return token;
  }

  it('protects ingestion and imports idempotently with source-missing state', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/ingestion/products')
      .expect(401);

    const userToken = await accessTokenFor(
      'catalog-user@phase3.test',
      Role.USER,
    );
    await request(app.getHttpServer())
      .post('/api/v1/admin/ingestion/products')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const adminToken = await accessTokenFor(
      'catalog-admin@phase3.test',
      Role.ADMIN,
    );
    const accepted = await request(app.getHttpServer())
      .post('/api/v1/admin/ingestion/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(202);
    expect(accepted.body).toEqual({
      jobId: 'sync-products-test',
      status: 'queued',
    });
    expect(queueService.enqueueSyncProducts).toHaveBeenCalledTimes(1);

    const first = await ingestion.importProducts();
    expect(first).toEqual({
      received: 2,
      created: 2,
      updated: 0,
      unchanged: 0,
      sourceMissing: 0,
    });

    const repeated = await ingestion.importProducts();
    expect(repeated).toMatchObject({
      received: 2,
      created: 0,
      updated: 0,
      unchanged: 2,
    });
    expect(await prisma.product.count()).toBe(2);
    expect(await prisma.productImage.count()).toBe(1);
    expect(await prisma.productReview.count()).toBe(1);

    const activeProduct = await prisma.product.findUniqueOrThrow({
      where: {
        source_externalId: { source: 'dummyjson', externalId: '900001' },
      },
    });
    const defaultListKey = buildProductListCacheKey({
      page: 1,
      pageSize: 20,
      sort: 'rating_desc',
    });
    await request(app.getHttpServer()).get('/api/v1/products').expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/products/${activeProduct.id}`)
      .expect(200);
    await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
    expect(await redis.get(defaultListKey)).not.toBeNull();
    expect(
      await redis.get(CATALOG_CACHE_KEYS.product(activeProduct.id)),
    ).not.toBeNull();
    expect(await redis.get(CATALOG_CACHE_KEYS.categories)).not.toBeNull();

    const changedPayload = catalogPayload();
    const products = changedPayload.products as Record<string, unknown>[];
    changedPayload.products = [
      { ...products[0], description: 'Changed canonical description' },
    ];
    changedPayload.total = 1;
    changedPayload.limit = 1;
    dummyJsonClient.fetchProducts.mockResolvedValue(changedPayload);
    const changed = await ingestion.importProducts();
    expect(changed).toMatchObject({
      received: 1,
      updated: 1,
      sourceMissing: 1,
    });
    expect(
      await prisma.product.count({ where: { sourceStatus: 'MISSING' } }),
    ).toBe(1);
    expect(await redis.get(defaultListKey)).toBeNull();
    expect(
      await redis.get(CATALOG_CACHE_KEYS.product(activeProduct.id)),
    ).toBeNull();
    expect(await redis.get(CATALOG_CACHE_KEYS.categories)).toBeNull();
    const browse = await request(app.getHttpServer())
      .get('/api/v1/products')
      .expect(200);
    expect(browse.body.total).toBe(1);
  });

  it('serves local catalog filters, sorting, pagination, detail, and caches', async () => {
    await ingestion.importProducts();

    const filtered = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({
        category: 'laptops',
        minPrice: 900,
        maxPrice: 1100,
        brand: 'shopmind test',
        minRating: 4,
      })
      .expect(200);
    expect(filtered.body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(filtered.body.items[0].title).toBe('Phase Three Laptop');

    const sorted = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ page: 1, pageSize: 1, sort: 'price_asc' })
      .expect(200);
    expect(sorted.body).toMatchObject({ total: 2, totalPages: 2 });
    expect(sorted.body.items[0].title).toBe('Phase Three Phone');
    expect(
      await redis.get(
        buildProductListCacheKey({
          page: 1,
          pageSize: 1,
          sort: 'price_asc',
        }),
      ),
    ).not.toBeNull();
    const listTtl = await redis.ttl(
      buildProductListCacheKey({
        page: 1,
        pageSize: 1,
        sort: 'price_asc',
      }),
    );
    expect(listTtl).toBeGreaterThan(0);
    expect(listTtl).toBeLessThanOrEqual(180);

    const product = await prisma.product.findUniqueOrThrow({
      where: {
        source_externalId: { source: 'dummyjson', externalId: '900001' },
      },
    });
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/products/${product.id}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      id: product.id,
      images: [{ sortOrder: 0 }],
      reviews: [{ reviewerName: 'Catalog Reviewer' }],
    });
    expect(
      await redis.get(CATALOG_CACHE_KEYS.product(product.id)),
    ).not.toBeNull();
    const productTtl = await redis.ttl(CATALOG_CACHE_KEYS.product(product.id));
    expect(productTtl).toBeGreaterThan(0);
    expect(productTtl).toBeLessThanOrEqual(600);

    const categories = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);
    expect(
      categories.body.map((category: { slug: string }) => category.slug),
    ).toEqual(['laptops', 'smartphones']);
    expect(await redis.get(CATALOG_CACHE_KEYS.categories)).not.toBeNull();
    const categoriesTtl = await redis.ttl(CATALOG_CACHE_KEYS.categories);
    expect(categoriesTtl).toBeGreaterThan(0);
    expect(categoriesTtl).toBeLessThanOrEqual(3600);

    const missing = await request(app.getHttpServer())
      .get(`/api/v1/products/${randomUUID()}`)
      .expect(404);
    expect(missing.body.error).toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      requestId: expect.any(String),
    });
  });

  it('falls back to PostgreSQL when Redis catalog operations fail', async () => {
    await ingestion.importProducts();
    const getSpy = jest
      .spyOn(redis, 'get')
      .mockRejectedValue(new Error('Redis unavailable'));
    const setSpy = jest
      .spyOn(redis, 'setWithTtl')
      .mockRejectedValue(new Error('Redis unavailable'));

    try {
      const product = await prisma.product.findFirstOrThrow();
      await request(app.getHttpServer()).get('/api/v1/products').expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/products/${product.id}`)
        .expect(200);
      await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
    }
  });

  it('searches canonical products by keyword with filters, sorting, and pagination', async () => {
    await ingestion.importProducts();

    const title = await request(app.getHttpServer())
      .get('/api/v1/search')
      .query({ q: 'Laptop' })
      .expect(200);
    expect(
      title.body.items.map((item: { title: string }) => item.title),
    ).toEqual(['Phase Three Laptop']);

    const description = await request(app.getHttpServer())
      .get('/api/v1/search')
      .query({ q: 'Compact' })
      .expect(200);
    expect(description.body.items[0].title).toBe('Phase Three Phone');

    const brand = await request(app.getHttpServer())
      .get('/api/v1/search')
      .query({ q: 'Other Brand' })
      .expect(200);
    expect(brand.body.items[0].title).toBe('Phase Three Phone');

    const combined = await request(app.getHttpServer())
      .get('/api/v1/search')
      .query({
        q: 'fixture',
        category: 'smartphones',
        minPrice: 250,
        maxPrice: 350,
        sort: 'price_asc',
        page: 1,
        pageSize: 1,
      })
      .expect(200);
    expect(combined.body).toMatchObject({ total: 1, totalPages: 1 });
    expect(combined.body.items[0].title).toBe('Phase Three Phone');

    const paginated = await request(app.getHttpServer())
      .get('/api/v1/search')
      .query({ q: 'Phase Three', page: 2, pageSize: 1, sort: 'price_asc' })
      .expect(200);
    expect(paginated.body).toMatchObject({ total: 2, page: 2, totalPages: 2 });
    expect(paginated.body.items[0].title).toBe('Phase Three Laptop');

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/search')
      .query({ q: 'x' })
      .expect(400);
    expect(invalid.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: expect.any(String),
    });
  });

  it('rejects invalid external payloads without partial writes', async () => {
    dummyJsonClient.fetchProducts.mockResolvedValue({
      products: [{ id: 1, title: 'Invalid', price: 'invalid' }],
      total: 1,
      skip: 0,
      limit: 1,
    });
    await expect(ingestion.importProducts()).rejects.toMatchObject({
      code: 'EXTERNAL_DATA_ERROR',
    });
    expect(await prisma.product.count()).toBe(0);
  });
});
