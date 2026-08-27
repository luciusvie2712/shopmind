import type {
  AiCompareContract,
  AiSearchContract,
  ApiErrorResponse,
  AssistantTurnContract,
  AuthSessionContract,
  CartContract,
  CategoryContract,
  OrderContract,
  OrderListContract,
  ProductDetailContract,
  ProductListContract,
  ProductSummaryContract,
  RefreshAccessContract,
  SemanticSearchContract,
  UserContract,
  WishlistContract,
} from "@shopmind/contracts";
import { z } from "zod";

export const apiErrorResponseSchema: z.ZodType<ApiErrorResponse> = z.object({
  error: z.object({
    code: z.enum([
      "VALIDATION_ERROR",
      "AUTH_REQUIRED",
      "FORBIDDEN",
      "PRODUCT_NOT_FOUND",
      "OUT_OF_STOCK",
      "AI_INVALID_OUTPUT",
      "AI_PROVIDER_TIMEOUT",
      "AI_RATE_LIMITED",
      "EXTERNAL_DATA_ERROR",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    requestId: z.string(),
  }),
});

export const categorySchema: z.ZodType<CategoryContract> = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export const productSummarySchema: z.ZodType<ProductSummaryContract> = z.object(
  {
    id: z.string().uuid(),
    title: z.string(),
    brand: z.string().nullable(),
    price: z.number().nonnegative(),
    rating: z.number().min(0).max(5),
    stock: z.number().int().nonnegative(),
    thumbnail: z.string().nullable(),
    category: categorySchema,
  },
);

export const productListSchema: z.ZodType<ProductListContract> = z.object({
  items: z.array(productSummarySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const productDetailSchema: z.ZodType<ProductDetailContract> = z.object({
  id: z.string().uuid(),
  title: z.string(),
  brand: z.string().nullable(),
  price: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  stock: z.number().int().nonnegative(),
  thumbnail: z.string().nullable(),
  category: categorySchema,
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

export const categoriesSchema = z.array(categorySchema);

export const userSchema: z.ZodType<UserContract> = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  createdAt: z.string(),
});

export const authSessionSchema: z.ZodType<AuthSessionContract> = z.object({
  accessToken: z.string().min(1),
  user: userSchema,
});

export const refreshAccessSchema: z.ZodType<RefreshAccessContract> =
  authSessionSchema;

export const cartSchema: z.ZodType<CartContract> = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      product: productSummarySchema,
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
      lineTotal: z.number().nonnegative(),
    }),
  ),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const wishlistSchema: z.ZodType<WishlistContract> = z.object({
  items: z.array(productSummarySchema),
});

export const orderSchema: z.ZodType<OrderContract> = z.object({
  id: z.string().uuid(),
  status: z.string(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      productId: z.string().uuid(),
      productThumbnail: z.string().nullable(),
      productTitleSnapshot: z.string(),
      unitPriceSnapshot: z.number().nonnegative(),
      quantity: z.number().int().positive(),
      lineTotal: z.number().nonnegative(),
    }),
  ),
});

export const orderListSchema: z.ZodType<OrderListContract> = z.object({
  items: z.array(orderSchema),
});

export const semanticSearchSchema: z.ZodType<SemanticSearchContract> = z.object(
  {
    items: z.array(
      z.object({
        product: productSummarySchema,
        semanticSimilarity: z.number().finite().min(-1).max(1),
      }),
    ),
  },
);

export const searchIntentSchema = z.object({
  category: z.string().optional(),
  price: z
    .object({
      min: z.number().finite().nonnegative().optional(),
      max: z.number().finite().nonnegative().optional(),
    })
    .optional(),
  brands: z.array(z.string()).optional(),
  minRating: z.number().finite().min(0).max(5).optional(),
  useCases: z.array(z.string()),
  requiredFeatures: z.array(z.string()),
  priorities: z.array(z.string()),
  negativePreferences: z.array(z.string()),
  semanticQuery: z.string(),
});

export const aiSearchSchema: z.ZodType<AiSearchContract> = z.object({
  intent: searchIntentSchema,
  results: z.array(
    z.object({
      product: productSummarySchema,
      score: z.number().finite().min(0).max(1),
      reason: z.string().optional(),
      tradeoffs: z.array(z.string()),
    }),
  ),
  status: z.enum(["success", "no_hard_match", "fallback"]),
  fallback: z
    .object({
      stage: z.enum(["intent", "retrieval", "recommendation"]),
      reason: z.enum(["AI_INVALID_OUTPUT", "AI_PROVIDER_TIMEOUT"]),
    })
    .optional(),
  requestId: z.string(),
});

export const comparisonProductSchema = z.intersection(
  productSummarySchema,
  z.object({
    attributes: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    ),
  }),
);

export const aiCompareSchema: z.ZodType<AiCompareContract> = z.object({
  products: z.array(comparisonProductSchema).min(2).max(4),
  summary: z.string().optional(),
  referencedProductIds: z.array(z.string().uuid()).max(4),
  status: z.enum(["success", "fallback"]),
  fallbackReason: z
    .enum(["AI_INVALID_OUTPUT", "AI_PROVIDER_TIMEOUT"])
    .optional(),
  requestId: z.string(),
});

export const assistantTurnSchema: z.ZodType<AssistantTurnContract> = z.object({
  conversationId: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.literal("ASSISTANT"),
    content: z.string(),
    createdAt: z.string(),
  }),
  products: z.array(productSummarySchema).max(10),
  requestId: z.string(),
});
