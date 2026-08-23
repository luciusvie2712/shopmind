import {
  RECOMMENDATION_LIMITS,
  recommendationOutputSchema,
} from './recommendation.schema';

const productId = '00000000-0000-4000-8000-000000000001';

describe('grounded recommendation schema', () => {
  it('accepts candidate IDs with bounded reason and tradeoffs', () => {
    expect(
      recommendationOutputSchema.parse({
        recommendations: [
          { productId, reason: 'Grounded fit', tradeoffs: ['Higher price'] },
        ],
      }),
    ).toMatchObject({ recommendations: [{ productId }] });
  });

  it.each([
    [
      {
        recommendations: [
          { productId, reason: 'One', tradeoffs: [] },
          { productId, reason: 'Two', tradeoffs: [] },
        ],
      },
      'duplicate IDs',
    ],
    [
      {
        recommendations: Array.from(
          { length: RECOMMENDATION_LIMITS.items + 1 },
          (_, index) => ({
            productId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
            reason: 'Fit',
            tradeoffs: [],
          }),
        ),
      },
      'oversized list',
    ],
    [
      {
        recommendations: [
          {
            productId,
            reason: 'x'.repeat(RECOMMENDATION_LIMITS.reasonLength + 1),
            tradeoffs: [],
          },
        ],
      },
      'oversized reason',
    ],
    [
      {
        recommendations: [
          {
            productId,
            reason: 'Fit',
            tradeoffs: ['x'.repeat(RECOMMENDATION_LIMITS.tradeoffLength + 1)],
          },
        ],
      },
      'oversized tradeoff',
    ],
  ] as const)('rejects %s (%s)', (value, caseName) => {
    if (recommendationOutputSchema.safeParse(value).success) {
      throw new Error(`Expected ${caseName} to be rejected`);
    }
  });
});
