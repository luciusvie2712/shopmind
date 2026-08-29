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
  AdminAiLogListContract,
  AdminIngestionStatusContract,
  AdminOrderListContract,
  AdminPaymentListContract,
  AdminProductListContract,
  AdminUserListContract,
} from "@shopmind/contracts";
import { z } from "zod";

export const createUserEventSchema = z.object({
  eventId: z.string().uuid(),
  status: z.enum(["recorded", "duplicate"]),
});

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

const adminQueueMetricsSchema = z.object({
  waiting: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

const adminPaginationShape = {
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
};

const adminPersonSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});
const paymentStatusSchema = z.enum([
  "REQUIRES_PAYMENT",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
]);

export const adminUserListSchema: z.ZodType<AdminUserListContract> = z.object({
  ...adminPaginationShape,
  items: z.array(
    z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string(),
      role: z.enum(["USER", "ADMIN"]),
      createdAt: z.string().datetime(),
      orderCount: z.number().int().nonnegative(),
      eventCount: z.number().int().nonnegative(),
    }),
  ),
  summary: z.object({
    users: z.number().int().nonnegative(),
    admins: z.number().int().nonnegative(),
  }),
});

export const adminOrderListSchema: z.ZodType<AdminOrderListContract> = z.object(
  {
    ...adminPaginationShape,
    items: z.array(
      z.object({
        id: z.string().uuid(),
        status: z.string(),
        subtotal: z.number().nonnegative(),
        total: z.number().nonnegative(),
        createdAt: z.string().datetime(),
        itemCount: z.number().int().nonnegative(),
        customer: adminPersonSchema,
        paymentStatus: paymentStatusSchema.nullable(),
      }),
    ),
    summary: z.object({
      orders: z.number().int().nonnegative(),
      orderValue: z.number().nonnegative(),
    }),
  },
);

export const adminPaymentListSchema: z.ZodType<AdminPaymentListContract> =
  z.object({
    ...adminPaginationShape,
    items: z.array(
      z.object({
        id: z.string().uuid(),
        orderId: z.string().uuid(),
        status: paymentStatusSchema,
        amount: z.number().nonnegative(),
        currency: z.string().length(3),
        provider: z.string(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        customer: adminPersonSchema,
      }),
    ),
    summary: z.object({
      payments: z.number().int().nonnegative(),
      succeeded: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      succeededValue: z.number().nonnegative(),
    }),
  });

export const adminProductListSchema: z.ZodType<AdminProductListContract> =
  z.object({
    ...adminPaginationShape,
    items: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        source: z.string(),
        externalId: z.string(),
        sourceStatus: z.string(),
        brand: z.string().nullable(),
        thumbnail: z.string().nullable(),
        category: z.string(),
        price: z.number().nonnegative(),
        rating: z.number().min(0).max(5),
        stock: z.number().int().nonnegative(),
        hasEmbedding: z.boolean(),
        reviewSummaryStatus: z.enum(["PENDING", "READY", "FAILED"]).nullable(),
        updatedAt: z.string().datetime(),
      }),
    ),
    summary: z.object({
      products: z.number().int().nonnegative(),
      active: z.number().int().nonnegative(),
      outOfStock: z.number().int().nonnegative(),
      embedded: z.number().int().nonnegative(),
    }),
  });

export const adminAiLogListSchema: z.ZodType<AdminAiLogListContract> = z.object(
  {
    ...adminPaginationShape,
    items: z.array(
      z.object({
        id: z.string().uuid(),
        operation: z.string(),
        model: z.string(),
        status: z.string(),
        inputTokens: z.number().int().nonnegative().nullable(),
        outputTokens: z.number().int().nonnegative().nullable(),
        latencyMs: z.number().nonnegative(),
        createdAt: z.string().datetime(),
        user: adminPersonSchema.nullable(),
      }),
    ),
    summary: z.object({
      requests: z.number().int().nonnegative(),
      failures: z.number().int().nonnegative(),
      averageLatencyMs: z.number().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    }),
  },
);

export const adminIngestionStatusSchema: z.ZodType<AdminIngestionStatusContract> =
  z.object({
    catalog: z.object({
      products: z.number().int().nonnegative(),
      active: z.number().int().nonnegative(),
      sourceMissing: z.number().int().nonnegative(),
      embedded: z.number().int().nonnegative(),
      lastProductUpdatedAt: z.string().datetime().nullable(),
      sources: z.array(
        z.object({
          source: z.string(),
          products: z.number().int().nonnegative(),
        }),
      ),
      reviewSummaries: z.array(
        z.object({
          status: z.enum(["PENDING", "READY", "FAILED"]),
          products: z.number().int().nonnegative(),
        }),
      ),
    }),
    jobs: z.object({
      available: z.boolean(),
      ingestion: adminQueueMetricsSchema.optional(),
      embedding: adminQueueMetricsSchema.optional(),
      reviewSummary: adminQueueMetricsSchema.optional(),
    }),
  });

export const adminAnalyticsOverviewSchema = z.object({
  range: z.object({ from: z.string().datetime(), to: z.string().datetime() }),
  catalog: z.object({
    products: z.number().int().nonnegative(),
    activeProducts: z.number().int().nonnegative(),
    sourceMissingProducts: z.number().int().nonnegative(),
    categories: z.number().int().nonnegative(),
    embeddingCoverage: z.number().min(0).max(1),
    staleEmbeddings: z.number().int().nonnegative(),
  }),
  ai: z.object({
    requests: z.number().int().nonnegative(),
    successes: z.number().int().nonnegative(),
    failures: z.number().int().nonnegative(),
    averageLatencyMs: z.number().nonnegative(),
    p95LatencyMs: z.number().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }),
  events: z.object({
    productViews: z.number().int().nonnegative(),
    searchClicks: z.number().int().nonnegative(),
    cartAdditions: z.number().int().nonnegative(),
    topProducts: z.array(
      z.object({
        product: productSummarySchema,
        events: z.number().int().nonnegative(),
      }),
    ),
  }),
  commerce: z.object({
    orders: z.number().int().nonnegative(),
    orderValue: z.number().nonnegative(),
  }),
  jobs: z.object({
    available: z.boolean(),
    ingestion: adminQueueMetricsSchema.optional(),
    embedding: adminQueueMetricsSchema.optional(),
    reviewSummary: adminQueueMetricsSchema.optional(),
  }),
});

export const recommendationsSchema = z.object({
  items: z.array(
    z.object({
      product: productSummarySchema,
      score: z.number().min(0).max(1),
      reason: z.enum(["preference", "behavior", "popular", "cold_start"]),
      rankingVersion: z.literal("personalized-v1"),
    }),
  ),
  personalized: z.boolean(),
  rankingVersion: z.literal("personalized-v1"),
});

export const reviewSummarySchema = z.object({
  status: z.enum(["unavailable", "pending", "ready", "failed"]),
  reviewCount: z.number().int().nonnegative(),
  reviewSetHash: z.string().length(64).optional(),
  themes: z.array(z.string()),
  positives: z.array(z.string()),
  negatives: z.array(z.string()),
  caveats: z.array(z.string()),
  updatedAt: z.string().datetime().optional(),
});

export const multimodalSearchSchema = z.object({
  mode: z.literal("image_to_text"),
  items: z.array(
    z.object({
      product: productSummarySchema,
      semanticSimilarity: z.number().min(-1).max(1),
    }),
  ),
});

export const paymentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  status: z.enum([
    "REQUIRES_PAYMENT",
    "PROCESSING",
    "SUCCEEDED",
    "FAILED",
    "CANCELED",
  ]),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  clientSecret: z.string().optional(),
});

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
