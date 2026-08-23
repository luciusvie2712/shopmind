import type {
  ProductDetailContract,
  ProductSummaryContract,
} from '@shopmind/contracts';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../../common/errors/api.exception';
import { CategoriesService } from '../../categories/categories.service';
import { ProductsService } from '../../products/products.service';
import type { RankedSearchCandidate } from '../../search/ranking';
import { SearchService } from '../../search/search.service';
import { WishlistService } from '../../wishlist/wishlist.service';
import { AiProviderInvalidOutputError } from '../provider/ai-provider';
import { ProductComparisonFactsService } from '../product-comparison-facts.service';
import { CompareProductsTool } from './compare-products.tool';
import { GetCategoriesTool } from './get-categories.tool';
import { GetProductTool } from './get-product.tool';
import { GetUserPreferencesTool } from './get-user-preferences.tool';
import { GetWishlistTool } from './get-wishlist.tool';
import { SearchProductsTool } from './search-products.tool';
import { AI_TOOL_LIMITS } from './tool-contract';
import { AiToolRegistry, AI_TOOL_NAMES } from './tool-registry';
import { MALICIOUS_PRODUCT_DESCRIPTION } from '../../../../test/fixtures/malicious-product';

const productId = '00000000-0000-4000-8000-000000000001';

function product(index = 1): ProductSummaryContract {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    title: `Product ${index}`,
    brand: 'ShopMind',
    price: 999,
    rating: 4.5,
    stock: 5,
    thumbnail: null,
    category: {
      id: '00000000-0000-4000-8000-000000000099',
      slug: 'laptops',
      name: 'Laptops',
    },
  };
}

function detail(): ProductDetailContract {
  return {
    ...product(),
    description: 'd'.repeat(1_200),
    metadata: Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => [
        `key${index}`,
        `value${index}`,
      ]),
    ),
    images: Array.from({ length: 8 }, (_, sortOrder) => ({
      url: `https://example.com/${sortOrder}.png`,
      sortOrder,
    })),
    reviews: Array.from({ length: 6 }, (_, index) => ({
      rating: 4,
      comment: `Review ${index}`,
      reviewerName: `Reviewer ${index}`,
      reviewedAt: new Date(index).toISOString(),
    })),
    updatedAt: new Date().toISOString(),
  };
}

function ranked(index: number): RankedSearchCandidate {
  const summary = product(index);
  return {
    product: {
      ...summary,
      price: new Prisma.Decimal(summary.price),
      rating: new Prisma.Decimal(summary.rating),
      description: 'Canonical description',
    },
    semanticSimilarity: 1,
    keywordRelevance: 1,
    preferenceMatch: 0,
    normalizedRating: 0.9,
    stockSignal: 1,
    score: 0.9,
  };
}

describe('AI read-only tool registry', () => {
  const searchFallback = jest.fn();
  const productDetail = jest.fn();
  const comparisonFacts = jest.fn();
  const categoryList = jest.fn();
  const wishlistList = jest.fn();
  const registry = new AiToolRegistry(
    new SearchProductsTool({ searchFallback } as unknown as SearchService),
    new GetProductTool({ detail: productDetail } as unknown as ProductsService),
    new CompareProductsTool({
      getFacts: comparisonFacts,
    } as unknown as ProductComparisonFactsService),
    new GetCategoriesTool({
      list: categoryList,
    } as unknown as CategoriesService),
    new GetUserPreferencesTool(),
    new GetWishlistTool({ list: wishlistList } as unknown as WishlistService),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    searchFallback.mockResolvedValue([]);
    productDetail.mockResolvedValue(detail());
    comparisonFacts.mockResolvedValue([product(1), product(2)]);
    categoryList.mockResolvedValue([]);
    wishlistList.mockResolvedValue({ items: [] });
  });

  it('contains exactly the six approved read-only tools', () => {
    expect(registry.names()).toEqual(AI_TOOL_NAMES);
    expect(registry.names()).not.toEqual(
      expect.arrayContaining(['checkout', 'add_to_cart']),
    );
  });

  it.each(['checkout', 'add_to_cart', 'anything_else'])(
    'rejects unknown or write tool %s',
    async (name) => {
      await expect(
        registry.execute(name, {}, { requestId: 'request-1' }),
      ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    },
  );

  it.each([
    ['search_products', { semanticQuery: 'laptop', limit: 500 }],
    ['get_product', { productId: 'invalid' }],
    ['compare_products', { productIds: [productId] }],
    [
      'compare_products',
      {
        productIds: Array.from(
          { length: 5 },
          (_, index) =>
            `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        ),
      },
    ],
    ['compare_products', { productIds: [productId, productId] }],
    ['get_categories', { unexpected: true }],
    ['get_user_preferences', { userId: productId }],
    ['get_wishlist', { userId: productId }],
  ] as const)(
    'strictly rejects invalid arguments for %s',
    async (name, input) => {
      await expect(
        registry.execute(name, input, {
          userId: productId,
          requestId: 'request-2',
        }),
      ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    },
  );

  it.each(['get_user_preferences', 'get_wishlist'])(
    'enforces authenticated context inside %s',
    async (name) => {
      await expect(
        registry.execute(name, {}, { requestId: 'request-3' }),
      ).rejects.toBeInstanceOf(ApiException);
    },
  );

  it('server-caps deterministic search output at ten products', async () => {
    searchFallback.mockResolvedValue(
      Array.from({ length: 15 }, (_, index) => ranked(index + 1)),
    );
    const result = await registry.execute(
      'search_products',
      { semanticQuery: 'development laptop', limit: 20 },
      { requestId: 'request-4' },
    );
    expect(result.products).toHaveLength(AI_TOOL_LIMITS.searchProducts);
    expect(searchFallback).toHaveBeenCalledWith(
      expect.objectContaining({ limit: AI_TOOL_LIMITS.searchProducts }),
    );
  });

  it('bounds detail, categories and wishlist projections', async () => {
    categoryList.mockResolvedValue(
      Array.from({ length: 120 }, (_, index) => ({
        id: product(index + 1).id,
        slug: `category-${index}`,
        name: `Category ${index}`,
      })),
    );
    wishlistList.mockResolvedValue({
      items: Array.from({ length: 25 }, (_, index) => product(index + 1)),
    });
    const detailResult = await registry.execute(
      'get_product',
      { productId },
      { requestId: 'request-5' },
    );
    const detailOutput = detailResult.output as {
      description: string;
      images: readonly unknown[];
      reviews: readonly unknown[];
      attributes: Readonly<Record<string, unknown>>;
    };
    expect(detailOutput.description).toHaveLength(
      AI_TOOL_LIMITS.detailDescriptionLength,
    );
    expect(detailOutput.images).toHaveLength(AI_TOOL_LIMITS.detailImages);
    expect(detailOutput.reviews).toHaveLength(AI_TOOL_LIMITS.detailReviews);
    expect(Object.keys(detailOutput.attributes)).toHaveLength(
      AI_TOOL_LIMITS.metadataAttributes,
    );
    const categories = await registry.execute(
      'get_categories',
      {},
      { requestId: 'request-7' },
    );
    expect(categories.output).toHaveLength(AI_TOOL_LIMITS.categories);
    const wishlist = await registry.execute(
      'get_wishlist',
      {},
      { userId: productId, requestId: 'request-8' },
    );
    expect(wishlist.products).toHaveLength(AI_TOOL_LIMITS.wishlistProducts);
  });

  it('compare_products returns facts without any provider dependency', async () => {
    const result = await registry.execute(
      'compare_products',
      {
        productIds: [product(1).id, product(2).id],
      },
      { requestId: 'request-9' },
    );
    expect(comparisonFacts).toHaveBeenCalledTimes(1);
    expect(result.products).toHaveLength(2);
  });

  it('keeps malicious product text unable to register tools or invoke writes', async () => {
    const writeOperations = {
      checkout: jest.fn(),
      addToCart: jest.fn(),
      updateProduct: jest.fn(),
    };
    productDetail.mockResolvedValue({
      ...detail(),
      description: MALICIOUS_PRODUCT_DESCRIPTION,
      price: 999,
      stock: 5,
    });
    const canonical = await registry.execute(
      'get_product',
      { productId },
      { userId: productId, requestId: 'injection-request' },
    );
    expect(canonical.output).toMatchObject({ price: 999, stock: 5 });
    for (const attemptedTool of ['checkout', 'add_to_cart', 'update_product']) {
      await expect(
        registry.execute(
          attemptedTool,
          { userId: 'other-user', role: 'ADMIN', isAdmin: true },
          { userId: productId, requestId: 'injection-request' },
        ),
      ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    }
    expect(writeOperations.checkout).not.toHaveBeenCalled();
    expect(writeOperations.addToCart).not.toHaveBeenCalled();
    expect(writeOperations.updateProduct).not.toHaveBeenCalled();
    expect(registry.names()).toEqual(AI_TOOL_NAMES);
  });
});
