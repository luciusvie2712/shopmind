import { humanizeSlug, toSlug } from './slug';

describe('slug utilities', () => {
  it('normalizes category text deterministically', () => {
    expect(toSlug('  Men’s Áccessories  ')).toBe('mens-accessories');
    expect(humanizeSlug('mens-accessories')).toBe('Mens Accessories');
  });
});
