export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "PRODUCT_NOT_FOUND"
  | "OUT_OF_STOCK"
  | "ORDER_NOT_FOUND"
  | "PAYMENT_SIMULATION_DISABLED"
  | "PAYMENT_NOT_AVAILABLE"
  | "FULFILLMENT_NOT_AVAILABLE"
  | "INVALID_FULFILLMENT_TRANSITION"
  | "AI_INVALID_OUTPUT"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "EXTERNAL_DATA_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly requestId: string;
  };
}

export type ProductSortValue =
  "price_asc" | "price_desc" | "rating_asc" | "rating_desc";

export interface CategoryContract {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export interface ProductSummaryContract {
  readonly id: string;
  readonly title: string;
  readonly brand: string | null;
  readonly price: number;
  readonly rating: number;
  readonly stock: number;
  readonly thumbnail: string | null;
  readonly category: CategoryContract;
}

export interface ProductListContract {
  readonly items: readonly ProductSummaryContract[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ProductImageContract {
  readonly url: string;
  readonly sortOrder: number;
}

export interface ProductReviewContract {
  readonly rating: number;
  readonly comment: string;
  readonly reviewerName: string;
  readonly reviewedAt: string;
}

export interface ProductDetailContract extends ProductSummaryContract {
  readonly description: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly images: readonly ProductImageContract[];
  readonly reviews: readonly ProductReviewContract[];
  readonly updatedAt: string;
}

export interface ProductListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly brand?: string;
  readonly minRating?: number;
  readonly sort?: ProductSortValue;
}

export interface ProductSearchQuery extends ProductListQuery {
  readonly q: string;
}

export interface SemanticSearchRequest {
  readonly query: string;
  readonly limit?: number;
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
}

export interface SemanticSearchCandidateContract {
  readonly product: ProductSummaryContract;
  readonly semanticSimilarity: number;
}

export interface SemanticSearchContract {
  readonly items: readonly SemanticSearchCandidateContract[];
}

export interface SearchIntentContract {
  readonly category?: string;
  readonly price?: {
    readonly min?: number;
    readonly max?: number;
  };
  readonly brands?: readonly string[];
  readonly minRating?: number;
  readonly useCases: readonly string[];
  readonly requiredFeatures: readonly string[];
  readonly priorities: readonly string[];
  readonly negativePreferences: readonly string[];
  readonly semanticQuery: string;
}

export interface AiSearchRequest {
  readonly query: string;
  readonly limit?: number;
}

export type AiSearchStatus = "success" | "no_hard_match" | "fallback";
export type AiSearchFallbackStage = "intent" | "retrieval" | "recommendation";
export type AiSearchFallbackReason =
  "AI_INVALID_OUTPUT" | "AI_PROVIDER_TIMEOUT";

export interface AiSearchResultContract {
  readonly product: ProductSummaryContract;
  readonly score: number;
  readonly reason?: string;
  readonly tradeoffs: readonly string[];
}

export interface AiSearchContract {
  readonly intent: SearchIntentContract;
  readonly results: readonly AiSearchResultContract[];
  readonly status: AiSearchStatus;
  readonly fallback?: {
    readonly stage: AiSearchFallbackStage;
    readonly reason: AiSearchFallbackReason;
  };
  readonly requestId: string;
}

export type ComparisonAttributeValue = string | number | boolean | null;

export interface ComparisonProductContract extends ProductSummaryContract {
  readonly attributes: Readonly<Record<string, ComparisonAttributeValue>>;
}

export interface AiCompareRequest {
  readonly productIds: readonly string[];
}

export type AiCompareStatus = "success" | "fallback";

export interface AiCompareContract {
  readonly products: readonly ComparisonProductContract[];
  readonly summary?: string;
  readonly referencedProductIds: readonly string[];
  readonly status: AiCompareStatus;
  readonly fallbackReason?: AiSearchFallbackReason;
  readonly requestId: string;
}

export interface AssistantMessageRequest {
  readonly conversationId?: string;
  readonly message: string;
}

export interface AssistantMessageContract {
  readonly id: string;
  readonly role: "ASSISTANT";
  readonly content: string;
  readonly createdAt: string;
}

export interface AssistantTurnContract {
  readonly conversationId: string;
  readonly message: AssistantMessageContract;
  readonly products: readonly ProductSummaryContract[];
  readonly requestId: string;
}

export type UserRole = "USER" | "ADMIN";

export interface UserContract {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly createdAt: string;
}

export interface AuthSessionContract {
  readonly accessToken: string;
  readonly user: UserContract;
}

export interface RefreshAccessContract {
  readonly accessToken: string;
  readonly user: UserContract;
}

export interface CartItemContract {
  readonly id: string;
  readonly product: ProductSummaryContract;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

export interface CartContract {
  readonly items: readonly CartItemContract[];
  readonly subtotal: number;
  readonly total: number;
}

export interface WishlistContract {
  readonly items: readonly ProductSummaryContract[];
}

export interface OrderItemContract {
  readonly id: string;
  readonly productId: string;
  readonly productThumbnail: string | null;
  readonly productTitleSnapshot: string;
  readonly unitPriceSnapshot: number;
  readonly quantity: number;
  readonly lineTotal: number;
}

export interface OrderContract {
  readonly id: string;
  readonly status: string;
  readonly subtotal: number;
  readonly total: number;
  readonly createdAt: string;
  readonly items: readonly OrderItemContract[];
  readonly paymentStatus?: PaymentStatusContract | null;
  readonly fulfillmentStatus?: FulfillmentStatus | null;
}

export interface OrderListContract {
  readonly items: readonly OrderContract[];
}

export type AssistantStreamEventContract =
  | { readonly type: "message.start"; readonly requestId: string }
  | { readonly type: "message.delta"; readonly delta: string }
  | { readonly type: "message.done"; readonly turn: AssistantTurnContract }
  | {
      readonly type: "error";
      readonly code: ApiErrorCode;
      readonly message: string;
    }
  | { readonly type: "heartbeat" };

export type UserEventTypeContract =
  | "PRODUCT_VIEW"
  | "SEARCH_RESULT_CLICK"
  | "ADD_TO_CART"
  | "RECOMMENDATION_IMPRESSION"
  | "RECOMMENDATION_CLICK";

export interface UserEventMetadataContract {
  readonly surface?: string;
  readonly position?: number;
  readonly queryHash?: string;
}

export interface CreateUserEventRequest {
  readonly eventId: string;
  readonly type: UserEventTypeContract;
  readonly productId?: string;
  readonly correlationId?: string;
  readonly metadata?: UserEventMetadataContract;
}

export interface CreateUserEventContract {
  readonly eventId: string;
  readonly status: "recorded" | "duplicate";
}

export interface AdminMetricCountContract {
  readonly total: number;
}

export interface AdminQueueMetricsContract {
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
}

export interface AdminAnalyticsOverviewContract {
  readonly range: { readonly from: string; readonly to: string };
  readonly catalog: {
    readonly products: number;
    readonly activeProducts: number;
    readonly sourceMissingProducts: number;
    readonly categories: number;
    readonly embeddingCoverage: number;
    readonly staleEmbeddings: number;
  };
  readonly ai: {
    readonly requests: number;
    readonly successes: number;
    readonly failures: number;
    readonly averageLatencyMs: number;
    readonly p95LatencyMs: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly events: {
    readonly productViews: number;
    readonly searchClicks: number;
    readonly cartAdditions: number;
    readonly topProducts: readonly {
      readonly product: ProductSummaryContract;
      readonly events: number;
    }[];
  };
  readonly commerce: {
    readonly orders: number;
    readonly orderValue: number;
  };
  readonly jobs: {
    readonly available: boolean;
    readonly ingestion?: AdminQueueMetricsContract;
    readonly embedding?: AdminQueueMetricsContract;
    readonly reviewSummary?: AdminQueueMetricsContract;
  };
}

export interface AdminPaginationContract {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface AdminUserListContract extends AdminPaginationContract {
  readonly items: readonly (UserContract & {
    readonly orderCount: number;
    readonly eventCount: number;
  })[];
  readonly summary: { readonly users: number; readonly admins: number };
}

export interface AdminOrderListContract extends AdminPaginationContract {
  readonly items: readonly {
    readonly id: string;
    readonly status: string;
    readonly subtotal: number;
    readonly total: number;
    readonly createdAt: string;
    readonly itemCount: number;
    readonly customer: { readonly name: string; readonly email: string };
    readonly paymentStatus: PaymentStatusContract | null;
  }[];
  readonly summary: { readonly orders: number; readonly orderValue: number };
}

export type PaymentStatusContract =
  "PENDING" | "PAID" | "REQUIRES_PAYMENT" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type PaymentProvider = "SIMULATED" | "STRIPE_TEST";
export type FulfillmentStatus =
  | "ORDER_RECEIVED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED";
export type FulfillmentScenario = "SUCCESS" | "FAILURE";

export interface OrderPaymentSummary {
  readonly id: string;
  readonly provider: PaymentProvider;
  readonly status: PaymentStatusContract;
  readonly amount: number;
  readonly currency: string;
  readonly reference: string;
  readonly qrPayload: string;
  readonly paidAt: string | null;
}

export interface FulfillmentTimelineEvent {
  readonly status: FulfillmentStatus;
  readonly occurredAt: string;
}

export interface FulfillmentSummary {
  readonly id: string;
  readonly status: FulfillmentStatus;
  readonly scenario: FulfillmentScenario;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly expectedCompletionAt: string;
  readonly timeline: readonly FulfillmentTimelineEvent[];
}

export interface OrderDetailContract extends OrderContract {
  readonly currency: string;
  readonly payment: OrderPaymentSummary;
  readonly fulfillment: FulfillmentSummary | null;
}

export interface SimulatePaymentRequest {
  readonly deliveryScenario?: FulfillmentScenario;
}

export interface SimulatePaymentResponse {
  readonly payment: OrderPaymentSummary;
  readonly fulfillment: FulfillmentSummary;
}

export interface AdminPaymentListContract extends AdminPaginationContract {
  readonly items: readonly {
    readonly id: string;
    readonly orderId: string;
    readonly status: PaymentStatusContract;
    readonly amount: number;
    readonly currency: string;
    readonly provider: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly customer: { readonly name: string; readonly email: string };
  }[];
  readonly summary: {
    readonly payments: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly succeededValue: number;
  };
}

export interface AdminProductListContract extends AdminPaginationContract {
  readonly items: readonly {
    readonly id: string;
    readonly title: string;
    readonly source: string;
    readonly externalId: string;
    readonly sourceStatus: string;
    readonly brand: string | null;
    readonly thumbnail: string | null;
    readonly category: string;
    readonly price: number;
    readonly rating: number;
    readonly stock: number;
    readonly hasEmbedding: boolean;
    readonly reviewSummaryStatus: "PENDING" | "READY" | "FAILED" | null;
    readonly updatedAt: string;
  }[];
  readonly summary: {
    readonly products: number;
    readonly active: number;
    readonly outOfStock: number;
    readonly embedded: number;
  };
}

export interface AdminAiLogListContract extends AdminPaginationContract {
  readonly items: readonly {
    readonly id: string;
    readonly operation: string;
    readonly model: string;
    readonly status: string;
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly latencyMs: number;
    readonly createdAt: string;
    readonly user: { readonly name: string; readonly email: string } | null;
  }[];
  readonly summary: {
    readonly requests: number;
    readonly failures: number;
    readonly averageLatencyMs: number;
    readonly totalTokens: number;
  };
}

export interface AdminIngestionStatusContract {
  readonly catalog: {
    readonly products: number;
    readonly active: number;
    readonly sourceMissing: number;
    readonly embedded: number;
    readonly lastProductUpdatedAt: string | null;
    readonly sources: readonly {
      readonly source: string;
      readonly products: number;
    }[];
    readonly reviewSummaries: readonly {
      readonly status: "PENDING" | "READY" | "FAILED";
      readonly products: number;
    }[];
  };
  readonly jobs: AdminAnalyticsOverviewContract["jobs"];
}

export interface AdminListQueryContract {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: string;
}

export interface RecommendationItemContract {
  readonly product: ProductSummaryContract;
  readonly score: number;
  readonly reason: "preference" | "behavior" | "popular" | "cold_start";
  readonly rankingVersion: "personalized-v1";
}

export interface RecommendationsContract {
  readonly items: readonly RecommendationItemContract[];
  readonly personalized: boolean;
  readonly rankingVersion: "personalized-v1";
}

export interface ReviewSummaryContract {
  readonly status: "unavailable" | "pending" | "ready" | "failed";
  readonly reviewCount: number;
  readonly reviewSetHash?: string;
  readonly themes: readonly string[];
  readonly positives: readonly string[];
  readonly negatives: readonly string[];
  readonly caveats: readonly string[];
  readonly updatedAt?: string;
}

export interface MultimodalSearchContract {
  readonly items: readonly SemanticSearchCandidateContract[];
  readonly mode: "image_to_text";
}

export interface CreatePaymentIntentRequest {
  readonly idempotencyKey: string;
}
export interface PaymentContract {
  readonly id: string;
  readonly orderId: string;
  readonly status:
    "PENDING" | "PAID" | "REQUIRES_PAYMENT" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  readonly amount: number;
  readonly currency: string;
  readonly clientSecret?: string;
}
