import type {
  CategoryContract,
  ProductDetailContract,
  ProductListContract,
  ProductSummaryContract,
} from '@shopmind/contracts';
import { z } from 'zod';

export const categoryContractSchema: z.ZodType<CategoryContract> = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export const productSummaryContractSchema: z.ZodType<ProductSummaryContract> =
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    brand: z.string().nullable(),
    price: z.number().nonnegative(),
    rating: z.number().min(0).max(5),
    stock: z.number().int().nonnegative(),
    thumbnail: z.string().nullable(),
    category: categoryContractSchema,
  });

export const productListContractSchema: z.ZodType<ProductListContract> =
  z.object({
    items: z.array(productSummaryContractSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });

export const productDetailContractSchema: z.ZodType<ProductDetailContract> =
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    brand: z.string().nullable(),
    price: z.number().nonnegative(),
    rating: z.number().min(0).max(5),
    stock: z.number().int().nonnegative(),
    thumbnail: z.string().nullable(),
    category: categoryContractSchema,
    description: z.string(),
    metadata: z.record(z.string(), z.unknown()),
    images: z.array(
      z.object({
        url: z.string().url(),
        sortOrder: z.number().int().nonnegative(),
      }),
    ),
    reviews: z.array(
      z.object({
        rating: z.number().min(0).max(5),
        comment: z.string(),
        reviewerName: z.string(),
        reviewedAt: z.string(),
      }),
    ),
    updatedAt: z.string(),
  });

export type {
  CategoryContract,
  ProductDetailContract,
  ProductListContract,
  ProductSummaryContract,
};
