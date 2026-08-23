import type { ComparisonProductContract } from '@shopmind/contracts';
import { CompareService } from './compare.service';
import { ProductComparisonFactsService } from './product-comparison-facts.service';
import {
  type AiProvider,
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
} from './provider/ai-provider';

const products: readonly ComparisonProductContract[] = [1, 2].map((index) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  title: `Product ${index}`,
  brand: 'ShopMind',
  price: 999,
  rating: 4.5,
  stock: 5,
  thumbnail: null,
  category: {
    id: '00000000-0000-4000-8000-000000000010',
    slug: 'laptops',
    name: 'Laptops',
  },
  attributes: {},
}));

describe('CompareService', () => {
  const compareProducts = jest.fn();
  const getFacts = jest.fn();
  const service = new CompareService(
    { compareProducts } as unknown as AiProvider,
    { getFacts } as unknown as ProductComparisonFactsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    getFacts.mockResolvedValue(products);
    compareProducts.mockResolvedValue({
      summary: 'Grounded summary',
      referencedProductIds: products.map(({ id }) => id),
    });
  });

  it('returns canonical facts and a grounded summary', async () => {
    await expect(
      service.compare(
        { productIds: products.map(({ id }) => id) },
        'request-1',
      ),
    ).resolves.toMatchObject({
      products,
      summary: 'Grounded summary',
      status: 'success',
    });
  });

  it.each([new AiProviderTimeoutError(), new AiProviderInvalidOutputError()])(
    'keeps canonical facts when AI summary fails',
    async (error) => {
      compareProducts.mockRejectedValue(error);
      const response = await service.compare(
        { productIds: products.map(({ id }) => id) },
        'request-2',
      );
      expect(response.products).toEqual(products);
      expect(response.status).toBe('fallback');
      expect(response.summary).toBeUndefined();
    },
  );
});
