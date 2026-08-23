import {
  buildEmbeddingText,
  type EmbeddingProductContent,
  priceBand,
} from './embedding-text.builder';

describe('embedding text builder', () => {
  const product: EmbeddingProductContent = {
    title: 'Developer Laptop',
    brand: 'Acme',
    category: 'Laptops',
    description: 'Portable workstation',
    price: 499,
    metadata: {
      tags: ['docker', 'coding', 'docker'],
      sku: 'ignored-in-embedding-text',
      dimensions: { width: 30, depth: 20, height: 2 },
      warrantyInformation: 'Two years',
    },
  };

  it('is deterministic and uses bounded canonical fields', () => {
    const first = buildEmbeddingText(product);
    const second = buildEmbeddingText(product);

    expect(first).toBe(second);
    expect(first).toContain('Title: Developer Laptop');
    expect(first).toContain('Tags: coding, docker');
    expect(first).toContain('Price band: mid-range');
    expect(first).not.toContain('ignored-in-embedding-text');
  });

  it('changes for relevant facts and ignores unrelated metadata', () => {
    const base = buildEmbeddingText(product);
    expect(buildEmbeddingText({ ...product, title: 'Changed title' })).not.toBe(
      base,
    );
    expect(
      buildEmbeddingText({
        ...product,
        metadata: {
          tags: ['docker', 'coding', 'docker'],
          sku: 'ignored-in-embedding-text',
          dimensions: { width: 30, depth: 20, height: 2 },
          warrantyInformation: 'Two years',
          updatedAt: '2099-01-01',
        },
      }),
    ).toBe(base);
  });

  it.each([
    [49, 'budget'],
    [50, 'value'],
    [200, 'mid-range'],
    [500, 'premium'],
  ])('maps %d to the %s price band', (price, expected) => {
    expect(priceBand(price)).toBe(expected);
  });
});
