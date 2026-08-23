import { type DummyJsonProduct } from './dummy-json.schema';
import {
  computeContentHash,
  normalizeDummyJsonProduct,
} from './product-normalizer';

const product: DummyJsonProduct = {
  id: 1,
  title: ' Test Phone ',
  description: ' Useful phone ',
  category: 'Smart Phones',
  price: 199.995,
  rating: 4.55,
  stock: 4,
  brand: ' Acme ',
  tags: ['mobile'],
  thumbnail: 'https://example.com/thumb.jpg',
  images: ['https://example.com/1.jpg', 'https://example.com/1.jpg'],
  reviews: [
    {
      rating: 4,
      comment: ' Good ',
      reviewerName: ' Reviewer ',
      date: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('DummyJSON product normalization', () => {
  it('normalizes catalog data and computes a deterministic hash', () => {
    const first = normalizeDummyJsonProduct(product);
    const second = normalizeDummyJsonProduct(product);

    expect(first).toMatchObject({
      category: { slug: 'smart-phones', name: 'Smart Phones' },
      brand: 'Acme',
      price: 200,
      images: ['https://example.com/1.jpg'],
    });
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes the hash only when canonical embedding content changes', () => {
    const base = normalizeDummyJsonProduct(product);
    const stockOnly = normalizeDummyJsonProduct({ ...product, stock: 99 });
    const semanticChange = normalizeDummyJsonProduct({
      ...product,
      description: 'Different description',
    });
    const ignoredMetadataChange = normalizeDummyJsonProduct({
      ...product,
      sku: 'different-ignored-sku',
    });

    expect(stockOnly.contentHash).toBe(base.contentHash);
    expect(ignoredMetadataChange.contentHash).toBe(base.contentHash);
    expect(semanticChange.contentHash).not.toBe(base.contentHash);
    expect(() =>
      computeContentHash({
        title: base.title,
        brand: base.brand,
        category: base.category.name,
        description: base.description,
        tags: ['mobile'],
        price: base.price,
        keyAttributes: {},
      }),
    ).not.toThrow();
  });
});
