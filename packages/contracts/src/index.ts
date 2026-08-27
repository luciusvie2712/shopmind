export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "PRODUCT_NOT_FOUND"
  | "OUT_OF_STOCK"
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

export type AiSearchStatus = 'success' | 'no_hard_match' | 'fallback';
export type AiSearchFallbackStage = 'intent' | 'retrieval' | 'recommendation';
export type AiSearchFallbackReason =
  | 'AI_INVALID_OUTPUT'
  | 'AI_PROVIDER_TIMEOUT';

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
}

export interface OrderListContract {
  readonly items: readonly OrderContract[];
}
