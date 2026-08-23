import { z } from 'zod';

export const ASSISTANT_LIMITS = {
  messageLength: 2_000,
  historyMessages: 20,
  referencedProducts: 10,
} as const;

export const assistantFinalOutputSchema = z
  .object({
    message: z.string().trim().min(1).max(ASSISTANT_LIMITS.messageLength),
    referencedProductIds: z
      .array(z.string().uuid())
      .max(ASSISTANT_LIMITS.referencedProducts),
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

export type AssistantFinalOutput = z.infer<typeof assistantFinalOutputSchema>;

export const assistantFinalOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    message: { type: 'string', maxLength: ASSISTANT_LIMITS.messageLength },
    referencedProductIds: {
      type: 'array',
      maxItems: ASSISTANT_LIMITS.referencedProducts,
      uniqueItems: true,
      items: { type: 'string' },
    },
  },
  required: ['message', 'referencedProductIds'],
} as const;
