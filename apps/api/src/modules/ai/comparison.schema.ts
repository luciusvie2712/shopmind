import { z } from 'zod';

export const COMPARE_LIMITS = {
  products: 4,
  summaryLength: 2_000,
} as const;

export const compareOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(COMPARE_LIMITS.summaryLength),
    referencedProductIds: z.array(z.string().uuid()).min(1).max(4),
  })
  .strict()
  .superRefine((output, context) => {
    if (
      new Set(output.referencedProductIds).size !==
      output.referencedProductIds.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'referenced product IDs must be unique',
        path: ['referencedProductIds'],
      });
    }
  });

export type CompareOutput = z.infer<typeof compareOutputSchema>;

export const compareOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', maxLength: COMPARE_LIMITS.summaryLength },
    referencedProductIds: {
      type: 'array',
      minItems: 1,
      maxItems: COMPARE_LIMITS.products,
      uniqueItems: true,
      items: { type: 'string' },
    },
  },
  required: ['summary', 'referencedProductIds'],
} as const;
