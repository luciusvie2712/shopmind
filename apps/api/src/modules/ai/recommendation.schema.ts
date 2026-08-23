import { z } from 'zod';

export const RECOMMENDATION_LIMITS = {
  items: 20,
  reasonLength: 400,
  tradeoffs: 4,
  tradeoffLength: 200,
} as const;

export interface GroundedCandidate {
  readonly id: string;
  readonly title: string;
  readonly brand: string | null;
  readonly category: string;
  readonly price: number;
  readonly rating: number;
  readonly stock: number;
  readonly score: number;
}

export interface GroundedRecommendationInput {
  readonly intent: import('./search-intent.schema').SearchIntent;
  readonly candidates: readonly GroundedCandidate[];
  readonly limit: number;
}

const recommendationItemSchema = z
  .object({
    productId: z.string().uuid(),
    reason: z.string().trim().min(1).max(RECOMMENDATION_LIMITS.reasonLength),
    tradeoffs: z
      .array(z.string().trim().min(1).max(RECOMMENDATION_LIMITS.tradeoffLength))
      .max(RECOMMENDATION_LIMITS.tradeoffs),
  })
  .strict();

export const recommendationOutputSchema = z
  .object({
    recommendations: z
      .array(recommendationItemSchema)
      .min(1)
      .max(RECOMMENDATION_LIMITS.items),
  })
  .strict()
  .superRefine((output, context) => {
    const ids = new Set<string>();
    output.recommendations.forEach((recommendation, index) => {
      if (ids.has(recommendation.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'recommendation product IDs must be unique',
          path: ['recommendations', index, 'productId'],
        });
      }
      ids.add(recommendation.productId);
    });
  });

export type GroundedRecommendationOutput = z.infer<
  typeof recommendationOutputSchema
>;

export const recommendationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      minItems: 1,
      maxItems: RECOMMENDATION_LIMITS.items,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          productId: { type: 'string' },
          reason: {
            type: 'string',
            maxLength: RECOMMENDATION_LIMITS.reasonLength,
          },
          tradeoffs: {
            type: 'array',
            maxItems: RECOMMENDATION_LIMITS.tradeoffs,
            items: {
              type: 'string',
              maxLength: RECOMMENDATION_LIMITS.tradeoffLength,
            },
          },
        },
        required: ['productId', 'reason', 'tradeoffs'],
      },
    },
  },
  required: ['recommendations'],
} as const;
