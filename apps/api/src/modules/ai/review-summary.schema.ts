import { z } from 'zod';

const boundedList = z.array(z.string().trim().min(1).max(240)).max(6);
export const reviewSummaryOutputSchema = z.object({
  themes: boundedList,
  positives: boundedList,
  negatives: boundedList,
  caveats: boundedList,
});
export type ReviewSummaryOutput = z.infer<typeof reviewSummaryOutputSchema>;
export const reviewSummaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['themes', 'positives', 'negatives', 'caveats'],
  properties: {
    themes: {
      type: 'array',
      maxItems: 6,
      items: { type: 'string', maxLength: 240 },
    },
    positives: {
      type: 'array',
      maxItems: 6,
      items: { type: 'string', maxLength: 240 },
    },
    negatives: {
      type: 'array',
      maxItems: 6,
      items: { type: 'string', maxLength: 240 },
    },
    caveats: {
      type: 'array',
      maxItems: 6,
      items: { type: 'string', maxLength: 240 },
    },
  },
} as const;
