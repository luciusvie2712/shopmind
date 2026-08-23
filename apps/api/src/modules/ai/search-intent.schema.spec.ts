import {
  SEARCH_INTENT_LIMITS,
  searchIntentSchema,
} from './search-intent.schema';

const minimalIntent = {
  useCases: [],
  requiredFeatures: [],
  priorities: [],
  negativePreferences: [],
  semanticQuery: 'laptop for development',
};

describe('SearchIntent schema', () => {
  it('accepts exact minimal and complete source contracts', () => {
    expect(searchIntentSchema.parse(minimalIntent)).toEqual(minimalIntent);
    expect(
      searchIntentSchema.parse({
        ...minimalIntent,
        category: 'laptops',
        price: { min: 500, max: 1_200 },
        brands: ['Framework'],
        minRating: 4,
        useCases: ['backend development'],
        requiredFeatures: ['16 GB RAM'],
        priorities: ['portability'],
        negativePreferences: ['gaming-first'],
      }),
    ).toMatchObject({ category: 'laptops', minRating: 4 });
  });

  it.each([
    [{ ...minimalIntent, unknown: true }, 'unknown field'],
    [
      {
        ...minimalIntent,
        useCases: Array.from(
          { length: SEARCH_INTENT_LIMITS.arrayItems + 1 },
          () => 'coding',
        ),
      },
      'oversized array',
    ],
    [{ ...minimalIntent, price: { min: -1 } }, 'negative price'],
    [{ ...minimalIntent, price: { min: 10, max: 5 } }, 'invalid price range'],
    [{ ...minimalIntent, minRating: 6 }, 'invalid rating'],
    [{ ...minimalIntent, semanticQuery: ' ' }, 'empty semantic query'],
    [
      {
        ...minimalIntent,
        semanticQuery: 'x'.repeat(SEARCH_INTENT_LIMITS.semanticQueryLength + 1),
      },
      'oversized semantic query',
    ],
    [{ ...minimalIntent, minRating: Number.NaN }, 'NaN'],
    [{ ...minimalIntent, price: { max: Infinity } }, 'Infinity'],
  ] as const)('rejects %s (%s)', (value, caseName) => {
    if (searchIntentSchema.safeParse(value).success) {
      throw new Error(`Expected ${caseName} to be rejected`);
    }
  });
});
