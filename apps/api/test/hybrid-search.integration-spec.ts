import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import {
  EMBEDDING_PROVIDER,
  type EmbeddingProvider,
} from '../src/modules/ai/embedding/embedding-provider';
import { ProductEmbeddingRepository } from '../src/modules/ingestion/product-embedding.repository';
import { SearchService } from '../src/modules/search/search.service';

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

function unitVector(): number[] {
  return Array.from({ length: 768 }, (_, index) => (index === 0 ? 1 : 0));
}

describe('Phase 7 hybrid-search integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let embeddings: ProductEmbeddingRepository;
  let search: SearchService;
  const embeddingProvider: EmbeddingProvider = {
    embedText: jest.fn(async () => unitVector()),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EMBEDDING_PROVIDER)
      .useValue(embeddingProvider)
      .compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
    embeddings = app.get(ProductEmbeddingRepository);
    search = app.get(SearchService);
  });

  beforeEach(async () => {
    jest.mocked(embeddingProvider.embedText).mockClear();
    await cleanup();
  });

  afterAll(async () => {
    if (prisma !== undefined) await cleanup();
    if (app !== undefined) await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.product.deleteMany({ where: { source: 'phase7-test' } });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: 'phase-seven-' } },
    });
  }

  async function createProduct(input: {
    externalId: string;
    categoryId: string;
    title: string;
    description: string;
    brand?: string;
    price?: number;
    rating?: number;
    stock?: number;
    withEmbedding?: boolean;
  }): Promise<string> {
    const product = await prisma.product.create({
      data: {
        source: 'phase7-test',
        externalId: input.externalId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        brand: input.brand ?? 'Required Brand',
        price: input.price ?? 900,
        rating: input.rating ?? 4.5,
        stock: input.stock ?? 5,
        thumbnail: null,
        metadata: {},
        contentHash: input.externalId.padEnd(64, '0').slice(0, 64),
        sourceStatus: 'ACTIVE',
      },
    });
    if (input.withEmbedding !== false) {
      await embeddings.upsertEmbedding({
        productId: product.id,
        vector: unitVector(),
        model: 'phase7-test-model',
        contentHash: product.contentHash,
      });
    }
    return product.id;
  }

  it('unions keyword/vector candidates, applies hard filters, and ranks deterministically', async () => {
    const laptops = await prisma.category.create({
      data: { slug: 'phase-seven-laptops', name: 'Phase Seven Laptops' },
    });
    const phones = await prisma.category.create({
      data: { slug: 'phase-seven-phones', name: 'Phase Seven Phones' },
    });
    const bothId = await createProduct({
      externalId: 'both',
      categoryId: laptops.id,
      title: 'Docker laptop hybrid',
      description: 'Canonical development system',
      rating: 4.8,
    });
    const semanticOnlyId = await createProduct({
      externalId: 'semantic-only',
      categoryId: laptops.id,
      title: 'Quiet workstation',
      description: 'Canonical professional machine',
      rating: 5,
    });
    const keywordOnlyId = await createProduct({
      externalId: 'keyword-only',
      categoryId: laptops.id,
      title: 'Docker laptop keyword',
      description: 'Canonical development system',
      rating: 4.5,
      withEmbedding: false,
    });
    const excludedIds = await Promise.all([
      createProduct({
        externalId: 'over-budget',
        categoryId: laptops.id,
        title: 'Docker laptop premium',
        description: 'Canonical development system',
        price: 1_300,
      }),
      createProduct({
        externalId: 'wrong-category',
        categoryId: phones.id,
        title: 'Docker laptop phone',
        description: 'Canonical development system',
      }),
      createProduct({
        externalId: 'wrong-brand',
        categoryId: laptops.id,
        title: 'Docker laptop other brand',
        description: 'Canonical development system',
        brand: 'Other Brand',
      }),
      createProduct({
        externalId: 'low-rating',
        categoryId: laptops.id,
        title: 'Docker laptop low rating',
        description: 'Canonical development system',
        rating: 3,
      }),
      createProduct({
        externalId: 'out-of-stock',
        categoryId: laptops.id,
        title: 'Docker laptop unavailable',
        description: 'Canonical development system',
        stock: 0,
      }),
    ]);

    const input = {
      query: 'docker laptop',
      category: 'phase-seven-laptops',
      brand: 'required brand',
      maxPrice: 1_000,
      minRating: 4,
      inStockOnly: true,
      limit: 20,
    } as const;
    const first = await search.searchHybrid(input);
    const second = await search.searchHybrid(input);
    const ids = first.map(({ product }) => product.id);

    expect(jest.mocked(embeddingProvider.embedText)).toHaveBeenCalledTimes(2);
    expect(ids).toEqual([bothId, semanticOnlyId, keywordOnlyId]);
    expect(second.map(({ product }) => product.id)).toEqual(ids);
    expect(ids).not.toEqual(expect.arrayContaining(excludedIds));
    expect(first.find(({ product }) => product.id === bothId)).toMatchObject({
      semanticSimilarity: 1,
      keywordRelevance: 1,
      preferenceMatch: 0,
    });
    expect(
      first.find(({ product }) => product.id === semanticOnlyId),
    ).toMatchObject({ semanticSimilarity: 1, keywordRelevance: 0 });
    expect(
      first.find(({ product }) => product.id === keywordOnlyId),
    ).toMatchObject({ semanticSimilarity: 0, keywordRelevance: 1 });
    expect(JSON.stringify(first)).not.toContain('embedding');
  });
});
