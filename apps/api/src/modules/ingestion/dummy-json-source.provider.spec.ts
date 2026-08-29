import { DummyJsonClient } from './dummy-json.client';
import { DummyJsonSourceProvider } from './dummy-json-source.provider';

describe('DummyJsonSourceProvider', () => {
  it('normalizes the vendor payload behind the source contract', async () => {
    const client = {
      fetchProducts: jest.fn().mockResolvedValue({
        products: [
          {
            id: 1,
            title: 'Phone',
            description: 'A phone',
            category: 'smartphones',
            price: 10,
            rating: 4,
            stock: 2,
            images: [],
            reviews: [],
            tags: [],
          },
        ],
        total: 1,
        skip: 0,
        limit: 1,
      }),
    } as unknown as DummyJsonClient;
    const page = await new DummyJsonSourceProvider(client).fetchPage();
    expect(page.source).toBe('dummyjson');
    expect(page.products[0]).toEqual(
      expect.objectContaining({
        source: 'dummyjson',
        externalId: '1',
        title: 'Phone',
      }),
    );
  });
});
