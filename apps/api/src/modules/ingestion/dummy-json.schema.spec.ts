import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dummyJsonProductsPayloadSchema } from './dummy-json.schema';

function loadFixture(name: string): unknown {
  const path = resolve(__dirname, `../../../test/fixtures/${name}`);
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

describe('DummyJSON payload contract', () => {
  it('accepts the valid catalog fixture', () => {
    expect(
      dummyJsonProductsPayloadSchema.safeParse(
        loadFixture('dummyjson-products.valid.json'),
      ).success,
    ).toBe(true);
  });

  it('rejects malformed external product data', () => {
    expect(
      dummyJsonProductsPayloadSchema.safeParse(
        loadFixture('dummyjson-products.invalid.json'),
      ).success,
    ).toBe(false);
  });
});
