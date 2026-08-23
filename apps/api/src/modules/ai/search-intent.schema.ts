import { z } from 'zod';

export const SEARCH_INTENT_LIMITS = {
  arrayItems: 8,
  itemLength: 100,
  semanticQueryLength: 500,
} as const;

const intentText = z
  .string()
  .trim()
  .min(1)
  .max(SEARCH_INTENT_LIMITS.itemLength);
const intentArray = z.array(intentText).max(SEARCH_INTENT_LIMITS.arrayItems);

const priceSchema = z
  .object({
    min: z.number().finite().nonnegative().optional(),
    max: z.number().finite().nonnegative().optional(),
  })
  .strict()
  .superRefine((price, context) => {
    if (
      price.min !== undefined &&
      price.max !== undefined &&
      price.min > price.max
    ) {
      context.addIssue({
        code: 'custom',
        message: 'price.min must not exceed price.max',
        path: ['min'],
      });
    }
  });

export const searchIntentSchema = z
  .object({
    category: intentText.optional(),
    price: priceSchema.optional(),
    brands: intentArray.optional(),
    minRating: z.number().finite().min(0).max(5).optional(),
    useCases: intentArray,
    requiredFeatures: intentArray,
    priorities: intentArray,
    negativePreferences: intentArray,
    semanticQuery: z
      .string()
      .trim()
      .min(1)
      .max(SEARCH_INTENT_LIMITS.semanticQueryLength),
  })
  .strict();

export type SearchIntent = z.infer<typeof searchIntentSchema>;

export const searchIntentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: { type: 'string', maxLength: SEARCH_INTENT_LIMITS.itemLength },
    price: {
      type: 'object',
      additionalProperties: false,
      properties: {
        min: { type: 'number', minimum: 0 },
        max: { type: 'number', minimum: 0 },
      },
    },
    brands: {
      type: 'array',
      maxItems: SEARCH_INTENT_LIMITS.arrayItems,
      items: { type: 'string', maxLength: SEARCH_INTENT_LIMITS.itemLength },
    },
    minRating: { type: 'number', minimum: 0, maximum: 5 },
    useCases: {
      type: 'array',
      maxItems: SEARCH_INTENT_LIMITS.arrayItems,
      items: { type: 'string', maxLength: SEARCH_INTENT_LIMITS.itemLength },
    },
    requiredFeatures: {
      type: 'array',
      maxItems: SEARCH_INTENT_LIMITS.arrayItems,
      items: { type: 'string', maxLength: SEARCH_INTENT_LIMITS.itemLength },
    },
    priorities: {
      type: 'array',
      maxItems: SEARCH_INTENT_LIMITS.arrayItems,
      items: { type: 'string', maxLength: SEARCH_INTENT_LIMITS.itemLength },
    },
    negativePreferences: {
      type: 'array',
      maxItems: SEARCH_INTENT_LIMITS.arrayItems,
      items: { type: 'string', maxLength: SEARCH_INTENT_LIMITS.itemLength },
    },
    semanticQuery: {
      type: 'string',
      maxLength: SEARCH_INTENT_LIMITS.semanticQueryLength,
    },
  },
  required: [
    'useCases',
    'requiredFeatures',
    'priorities',
    'negativePreferences',
    'semanticQuery',
  ],
} as const;
