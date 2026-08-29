import type {
  AiCompareContract,
  AiCompareRequest,
  AiSearchContract,
  AiSearchRequest,
  ApiErrorCode,
  AssistantMessageRequest,
  AssistantTurnContract,
  AuthSessionContract,
  CartContract,
  CategoryContract,
  OrderContract,
  OrderListContract,
  ProductDetailContract,
  ProductListContract,
  ProductListQuery,
  ProductSearchQuery,
  RefreshAccessContract,
  SemanticSearchContract,
  SemanticSearchRequest,
  UserContract,
  WishlistContract,
  CreateUserEventContract,
  CreateUserEventRequest,
  AdminAnalyticsOverviewContract,
  RecommendationsContract,
  ReviewSummaryContract,
  MultimodalSearchContract,
  PaymentContract,
  AdminAiLogListContract,
  AdminIngestionStatusContract,
  AdminListQueryContract,
  AdminOrderListContract,
  AdminPaymentListContract,
  AdminProductListContract,
  AdminUserListContract,
  OrderDetailContract,
  SimulatePaymentResponse,
} from "@shopmind/contracts";
import { z } from "zod";
import {
  apiErrorResponseSchema,
  aiCompareSchema,
  aiSearchSchema,
  assistantTurnSchema,
  authSessionSchema,
  cartSchema,
  categoriesSchema,
  orderListSchema,
  orderSchema,
  productDetailSchema,
  productListSchema,
  refreshAccessSchema,
  semanticSearchSchema,
  userSchema,
  wishlistSchema,
  createUserEventSchema,
  adminAnalyticsOverviewSchema,
  recommendationsSchema,
  reviewSummarySchema,
  multimodalSearchSchema,
  paymentSchema,
  adminAiLogListSchema,
  adminIngestionStatusSchema,
  adminOrderListSchema,
  adminPaymentListSchema,
  adminProductListSchema,
  adminUserListSchema,
  orderDetailSchema,
  simulatePaymentResponseSchema,
} from "./schemas";

export type ApiClientErrorCode =
  ApiErrorCode | "API_UNAVAILABLE" | "INVALID_RESPONSE";

export class ApiClientError extends Error {
  constructor(
    readonly code: ApiClientErrorCode,
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type NextRequestInit = RequestInit & {
  readonly next?: {
    readonly revalidate?: number | false;
    readonly tags?: readonly string[];
  };
};

interface ApiRequestOptions<T> extends NextRequestInit {
  readonly schema: z.ZodType<T>;
  readonly json?: unknown;
  readonly auth?: boolean;
  readonly retryAuth?: boolean;
}

let accessToken: string | null = null;
let refreshPromise: Promise<RefreshAccessContract> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function apiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  return (
    process.env.SHOPMIND_API_BASE_URL ?? "http://localhost:4000/api/v1"
  ).replace(/\/$/, "");
}

function apiUrl(path: string): string {
  const normalizedPath = path.replace(/^\//, "");
  return `${apiBaseUrl()}/${normalizedPath}`;
}

async function responsePayload(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions<T>,
): Promise<T> {
  const {
    schema,
    json,
    headers,
    auth = false,
    retryAuth = true,
    ...requestInit
  } = options;
  let response: Response;

  try {
    response = await fetch(apiUrl(path), {
      cache: "no-store",
      credentials: "include",
      ...requestInit,
      headers: {
        accept: "application/json",
        ...(json === undefined ? {} : { "content-type": "application/json" }),
        ...(auth && accessToken !== null
          ? { authorization: `Bearer ${accessToken}` }
          : {}),
        ...headers,
      },
      ...(json === undefined ? {} : { body: JSON.stringify(json) }),
    });
  } catch {
    throw new ApiClientError(
      "API_UNAVAILABLE",
      "ShopMind API is currently unavailable",
      0,
    );
  }

  const payload = await responsePayload(response);
  if (response.status === 401 && auth && retryAuth) {
    try {
      await refreshSession();
      return apiRequest(path, { ...options, retryAuth: false });
    } catch {
      setAccessToken(null);
    }
  }
  if (!response.ok) {
    const backendError = apiErrorResponseSchema.safeParse(payload);
    if (backendError.success) {
      throw new ApiClientError(
        backendError.data.error.code,
        backendError.data.error.message,
        response.status,
        backendError.data.error.requestId,
      );
    }

    throw new ApiClientError(
      "INVALID_RESPONSE",
      "ShopMind API returned an unexpected error response",
      response.status,
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "ShopMind API returned an invalid response",
      response.status,
    );
  }
  return parsed.data;
}

export async function registerUser(input: {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}): Promise<UserContract> {
  return apiRequest("auth/register", {
    method: "POST",
    schema: userSchema,
    json: input,
  });
}

export async function loginUser(input: {
  readonly email: string;
  readonly password: string;
}): Promise<AuthSessionContract> {
  const session = await apiRequest("auth/login", {
    method: "POST",
    schema: authSessionSchema,
    json: input,
  });
  setAccessToken(session.accessToken);
  return session;
}

export function refreshSession(): Promise<RefreshAccessContract> {
  refreshPromise ??= apiRequest("auth/refresh", {
    method: "POST",
    schema: refreshAccessSchema,
  })
    .then((session) => {
      setAccessToken(session.accessToken);
      return session;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function logoutUser(): Promise<void> {
  await apiRequest("auth/logout", {
    method: "POST",
    schema: z.null(),
    auth: true,
  });
  setAccessToken(null);
}

export function getCart(): Promise<CartContract> {
  return apiRequest("cart", { method: "GET", schema: cartSchema, auth: true });
}

export function addCartItem(
  productId: string,
  quantity: number,
): Promise<CartContract> {
  return apiRequest("cart/items", {
    method: "POST",
    schema: cartSchema,
    auth: true,
    json: { productId, quantity },
  });
}

export function updateCartItem(
  productId: string,
  quantity: number,
): Promise<CartContract> {
  return apiRequest(`cart/items/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    schema: cartSchema,
    auth: true,
    json: { quantity },
  });
}

export function removeCartItem(productId: string): Promise<CartContract> {
  return apiRequest(`cart/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    schema: cartSchema,
    auth: true,
  });
}

export function getWishlist(): Promise<WishlistContract> {
  return apiRequest("wishlist", {
    method: "GET",
    schema: wishlistSchema,
    auth: true,
  });
}

export function addWishlistItem(productId: string): Promise<WishlistContract> {
  return apiRequest(`wishlist/${encodeURIComponent(productId)}`, {
    method: "PUT",
    schema: wishlistSchema,
    auth: true,
  });
}

export function removeWishlistItem(
  productId: string,
): Promise<WishlistContract> {
  return apiRequest(`wishlist/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    schema: wishlistSchema,
    auth: true,
  });
}

export function checkoutCart(): Promise<OrderContract> {
  return apiRequest("orders/checkout", {
    method: "POST",
    schema: orderSchema,
    auth: true,
  });
}

export function getOrderDetail(orderId: string): Promise<OrderDetailContract> {
  return apiRequest(`orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    schema: orderDetailSchema,
    auth: true,
  });
}

export function simulateDemoPayment(orderId: string, deliveryScenario: "SUCCESS" | "FAILURE"): Promise<SimulatePaymentResponse> {
  return apiRequest(`orders/${encodeURIComponent(orderId)}/payment/simulate-success`, {
    method: "POST",
    schema: simulatePaymentResponseSchema,
    auth: true,
    json: { deliveryScenario },
  });
}

export function getOrders(): Promise<OrderListContract> {
  return apiRequest("orders", {
    method: "GET",
    schema: orderListSchema,
    auth: true,
  });
}

function queryString(query: object): string {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export function getProducts(
  query: ProductListQuery = {},
): Promise<ProductListContract> {
  return apiRequest(`products?${queryString(query)}`, {
    method: "GET",
    schema: productListSchema,
  });
}

export function searchProducts(
  query: ProductSearchQuery,
): Promise<ProductListContract> {
  return apiRequest(`search?${queryString(query)}`, {
    method: "GET",
    schema: productListSchema,
  });
}

export function semanticSearch(
  input: SemanticSearchRequest,
): Promise<SemanticSearchContract> {
  return apiRequest("search/semantic", {
    method: "POST",
    schema: semanticSearchSchema,
    json: input,
  });
}

export function aiSearch(input: AiSearchRequest): Promise<AiSearchContract> {
  return apiRequest("ai/search", {
    method: "POST",
    schema: aiSearchSchema,
    json: input,
  });
}

export function compareProducts(
  input: AiCompareRequest,
): Promise<AiCompareContract> {
  return apiRequest("ai/compare", {
    method: "POST",
    schema: aiCompareSchema,
    json: input,
  });
}

export function sendAssistantMessage(
  input: AssistantMessageRequest,
): Promise<AssistantTurnContract> {
  return apiRequest("ai/assistant/messages", {
    method: "POST",
    schema: assistantTurnSchema,
    auth: true,
    json: input,
  });
}

export function getProduct(id: string): Promise<ProductDetailContract> {
  return apiRequest(`products/${encodeURIComponent(id)}`, {
    method: "GET",
    schema: productDetailSchema,
  });
}

export function getCategories(): Promise<readonly CategoryContract[]> {
  return apiRequest("categories", {
    method: "GET",
    schema: categoriesSchema,
  });
}

export async function streamAssistantMessage(
  input: AssistantMessageRequest,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
  retryAuth = true,
): Promise<AssistantTurnContract> {
  let response: Response;
  try {
    response = await fetch(apiUrl("ai/assistant/stream"), {
      method: "POST",
      credentials: "include",
      signal,
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
        ...(accessToken === null
          ? {}
          : { authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiClientError(
      "API_UNAVAILABLE",
      "Assistant stream is unavailable",
      0,
    );
  }
  if (response.status === 401 && retryAuth) {
    await refreshSession();
    return streamAssistantMessage(input, onDelta, signal, false);
  }
  if (!response.ok || response.body === null) {
    if (response.status === 404 || response.status === 405)
      return sendAssistantMessage(input);
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "Assistant stream failed",
      response.status,
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed: AssistantTurnContract | undefined;
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const dataLine = frame
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(dataLine.slice(6)) as unknown;
      } catch {
        continue;
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("type" in payload)
      )
        continue;
      if (
        payload.type === "message.delta" &&
        "delta" in payload &&
        typeof payload.delta === "string"
      )
        onDelta(payload.delta);
      if (payload.type === "message.done" && "turn" in payload) {
        const parsed = assistantTurnSchema.safeParse(payload.turn);
        if (parsed.success) completed = parsed.data;
      }
      if (payload.type === "error")
        throw new ApiClientError(
          "AI_PROVIDER_TIMEOUT",
          "Assistant stream failed",
          502,
        );
    }
    if (done) break;
  }
  if (!completed)
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "Assistant stream ended without a final message",
      502,
    );
  return completed;
}

export function recordUserEvent(
  input: CreateUserEventRequest,
): Promise<CreateUserEventContract> {
  return apiRequest("events", {
    method: "POST",
    schema: createUserEventSchema,
    auth: true,
    retryAuth: false,
    json: input,
  });
}

export function getAdminAnalyticsOverview(
  days = 30,
): Promise<AdminAnalyticsOverviewContract> {
  return apiRequest(`admin/analytics/overview?days=${days}`, {
    method: "GET",
    schema: adminAnalyticsOverviewSchema,
    auth: true,
  });
}

function adminListQuery(query: AdminListQueryContract): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined)
    params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  return params.toString();
}

export function getAdminUsers(
  query: AdminListQueryContract,
): Promise<AdminUserListContract> {
  return apiRequest(`admin/users?${adminListQuery(query)}`, {
    method: "GET",
    schema: adminUserListSchema,
    auth: true,
  });
}

export function getAdminOrders(
  query: AdminListQueryContract,
): Promise<AdminOrderListContract> {
  return apiRequest(`admin/orders?${adminListQuery(query)}`, {
    method: "GET",
    schema: adminOrderListSchema,
    auth: true,
  });
}

export function getAdminPayments(
  query: AdminListQueryContract,
): Promise<AdminPaymentListContract> {
  return apiRequest(`admin/payments?${adminListQuery(query)}`, {
    method: "GET",
    schema: adminPaymentListSchema,
    auth: true,
  });
}

export function getAdminProducts(
  query: AdminListQueryContract,
): Promise<AdminProductListContract> {
  return apiRequest(`admin/products?${adminListQuery(query)}`, {
    method: "GET",
    schema: adminProductListSchema,
    auth: true,
  });
}

export function getAdminAiLogs(
  query: AdminListQueryContract,
): Promise<AdminAiLogListContract> {
  return apiRequest(`admin/ai-logs?${adminListQuery(query)}`, {
    method: "GET",
    schema: adminAiLogListSchema,
    auth: true,
  });
}

export function getAdminIngestionStatus(): Promise<AdminIngestionStatusContract> {
  return apiRequest("admin/ingestion/status", {
    method: "GET",
    schema: adminIngestionStatusSchema,
    auth: true,
  });
}

export function triggerAdminProductIngestion(): Promise<{
  readonly jobId: string;
  readonly status: "queued";
}> {
  return apiRequest("admin/ingestion/products", {
    method: "POST",
    schema: z.object({ jobId: z.string(), status: z.literal("queued") }),
    auth: true,
  });
}

export function getRecommendations(
  limit = 8,
): Promise<RecommendationsContract> {
  return apiRequest(`recommendations?limit=${limit}`, {
    method: "GET",
    schema: recommendationsSchema,
    auth: true,
  });
}

export function getReviewSummary(
  productId: string,
): Promise<ReviewSummaryContract> {
  return apiRequest(
    `products/${encodeURIComponent(productId)}/review-summary`,
    {
      method: "GET",
      schema: reviewSummarySchema,
    },
  );
}

export async function imageSearch(input: {
  readonly image: File;
  readonly category?: string;
  readonly maxPrice?: number;
}): Promise<MultimodalSearchContract> {
  const form = new FormData();
  form.set("image", input.image);
  if (input.category) form.set("category", input.category);
  if (input.maxPrice !== undefined)
    form.set("maxPrice", String(input.maxPrice));
  let response: Response;
  try {
    response = await fetch(apiUrl("search/image"), {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiClientError(
      "API_UNAVAILABLE",
      "Image search is unavailable",
      0,
    );
  }
  const payload = await responsePayload(response);
  if (!response.ok)
    throw new ApiClientError(
      "VALIDATION_ERROR",
      "The image could not be searched",
      response.status,
    );
  const parsed = multimodalSearchSchema.safeParse(payload);
  if (!parsed.success)
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "Image search returned an invalid response",
      response.status,
    );
  return parsed.data;
}

export function createPaymentIntent(
  idempotencyKey: string,
): Promise<PaymentContract> {
  return apiRequest("payments/intents", {
    method: "POST",
    schema: paymentSchema,
    auth: true,
    json: { idempotencyKey },
  });
}
