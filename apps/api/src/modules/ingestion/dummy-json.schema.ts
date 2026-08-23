import { z } from 'zod';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { toSlug } from '../../common/text/slug';

const nonEmptyString = z.string().trim().min(1);
const nonNegativeFiniteNumber = z.number().finite().nonnegative();

const dummyJsonReviewSchema = z.object({
  rating: z.number().finite().min(0).max(5),
  comment: nonEmptyString,
  date: nonEmptyString.refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'must be an ISO-compatible date',
  ),
  reviewerName: nonEmptyString,
});

const dummyJsonProductSchema = z.object({
  id: z.number().int().nonnegative(),
  title: nonEmptyString,
  description: nonEmptyString,
  category: nonEmptyString.refine(
    (value) => toSlug(value).length > 0,
    'must produce a valid category slug',
  ),
  price: nonNegativeFiniteNumber,
  rating: z.number().finite().min(0).max(5),
  stock: z.number().int().nonnegative(),
  brand: nonEmptyString.optional(),
  sku: nonEmptyString.optional(),
  weight: nonNegativeFiniteNumber.optional(),
  dimensions: z
    .object({
      width: nonNegativeFiniteNumber,
      height: nonNegativeFiniteNumber,
      depth: nonNegativeFiniteNumber,
    })
    .optional(),
  warrantyInformation: nonEmptyString.optional(),
  shippingInformation: nonEmptyString.optional(),
  availabilityStatus: nonEmptyString.optional(),
  returnPolicy: nonEmptyString.optional(),
  minimumOrderQuantity: z.number().int().positive().optional(),
  tags: z.array(nonEmptyString).default([]),
  thumbnail: z.string().url().optional(),
  images: z.array(z.string().url()).default([]),
  reviews: z.array(dummyJsonReviewSchema).default([]),
});

export const dummyJsonProductsPayloadSchema = z
  .object({
    products: z.array(dummyJsonProductSchema),
    total: z.number().int().nonnegative(),
    skip: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
  })
  .superRefine((payload, context) => {
    if (payload.products.length !== payload.total) {
      context.addIssue({
        code: 'custom',
        message: 'full import payload must contain every reported product',
        path: ['products'],
      });
    }

    const productIds = new Set<number>();
    payload.products.forEach((product, index) => {
      if (productIds.has(product.id)) {
        context.addIssue({
          code: 'custom',
          message: 'product IDs must be unique within one import',
          path: ['products', index, 'id'],
        });
      }
      productIds.add(product.id);
    });
  });

export type DummyJsonProduct = z.infer<typeof dummyJsonProductSchema>;
export type DummyJsonProductsPayload = z.infer<
  typeof dummyJsonProductsPayloadSchema
>;

export function parseDummyJsonProductsPayload(
  payload: unknown,
): DummyJsonProductsPayload {
  const result = dummyJsonProductsPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new ApiException(
      ERROR_CODES.EXTERNAL_DATA_ERROR,
      'External product data failed validation',
    );
  }

  return result.data;
}
