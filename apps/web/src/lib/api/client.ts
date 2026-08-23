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
  return apiRequest('search/semantic', {
    method: 'POST',
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
