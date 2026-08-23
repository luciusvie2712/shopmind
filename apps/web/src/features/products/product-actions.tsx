"use client";

import type { ProductSummaryContract } from "@shopmind/contracts";
import { Heart, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { useAddCartItem } from "@/features/cart/cart.queries";
import {
  useWishlistQuery,
  useWishlistToggle,
} from "@/features/wishlist/wishlist.queries";
import { ApiClientError } from "@/lib/api/client";

export function ProductActions({
  product,
  compact = false,
}: {
  readonly product: ProductSummaryContract;
  readonly compact?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const cart = useAddCartItem();
  const wishlist = useWishlistQuery(user !== null);
  const toggle = useWishlistToggle();
  const [message, setMessage] = useState<string>();
  const [messageIsError, setMessageIsError] = useState(false);
  const saved =
    wishlist.data?.items.some(({ id }) => id === product.id) ?? false;

  function requireAuth(): boolean {
    if (user !== null) return true;
    router.push("/login");
    return false;
  }

  async function addToCart() {
    if (!requireAuth()) return;
    setMessage(undefined);
    setMessageIsError(false);
    try {
      await cart.mutateAsync({ productId: product.id, quantity: 1 });
      setMessage("Added to cart");
    } catch (error) {
      setMessageIsError(true);
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Unable to update cart",
      );
    }
  }

  async function toggleWishlist() {
    if (!requireAuth()) return;
    setMessage(undefined);
    setMessageIsError(false);
    try {
      await toggle.mutateAsync({ productId: product.id, product, add: !saved });
    } catch (error) {
      setMessageIsError(true);
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Unable to update wishlist",
      );
    }
  }

  return (
    <div className={compact ? "mt-3" : "mt-8"}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={product.stock <= 0 || cart.isPending}
          onClick={() => void addToCart()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <ShoppingCart className="size-4" aria-hidden="true" />
          {product.stock <= 0 ? "Out of stock" : "Add to cart"}
        </button>
        <button
          type="button"
          disabled={toggle.isPending}
          onClick={() => void toggleWishlist()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
        >
          <Heart
            className={`size-4 ${saved ? "fill-red-500 text-red-500" : ""}`}
            aria-hidden="true"
          />
          {saved ? "Saved" : "Wishlist"}
        </button>
      </div>
      {message ? (
        <p
          role={messageIsError ? "alert" : "status"}
          className={`mt-2 text-xs ${messageIsError ? "text-red-700" : "text-slate-600"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
