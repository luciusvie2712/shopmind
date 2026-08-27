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
import { FeedbackAlert } from "@/components/feedback/feedback-alert";
import { getErrorFeedback } from "@/lib/feedback";

export function ProductActions({
  product,
  compact = false,
  iconOnly = false,
  quantity = 1,
  fullWidth = false,
}: {
  readonly product: ProductSummaryContract;
  readonly compact?: boolean;
  readonly iconOnly?: boolean;
  readonly quantity?: number;
  readonly fullWidth?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const cart = useAddCartItem();
  const wishlist = useWishlistQuery(user !== null);
  const toggle = useWishlistToggle();
  const [actionError, setActionError] = useState<unknown>();
  const feedback = actionError ? getErrorFeedback(actionError) : undefined;
  const saved =
    wishlist.data?.items.some(({ id }) => id === product.id) ?? false;

  function requireAuth(): boolean {
    if (user !== null) return true;
    router.push("/login");
    return false;
  }

  async function addToCart() {
    if (!requireAuth()) return;
    setActionError(undefined);
    try {
      await cart.mutateAsync({ productId: product.id, quantity });
    } catch (error) {
      setActionError(error);
    }
  }

  async function toggleWishlist() {
    if (!requireAuth()) return;
    setActionError(undefined);
    try {
      await toggle.mutateAsync({ productId: product.id, product, add: !saved });
    } catch (error) {
      setActionError(error);
    }
  }

  return (
    <div className={compact ? "mt-3" : "mt-8"}>
      <div className={`flex gap-2 ${fullWidth ? "flex-col" : "flex-wrap"} ${iconOnly ? "justify-end" : ""}`}>
        <button
          type="button"
          aria-label={
            iconOnly
              ? product.stock <= 0
                ? `${product.title} is out of stock`
                : `Add ${product.title} to cart`
              : undefined
          }
          title={product.stock <= 0 ? "Out of stock" : "Add to cart"}
          disabled={product.stock <= 0 || cart.isPending}
          onClick={() => void addToCart()}
          className={`${
            iconOnly
              ? "grid size-10 place-items-center rounded-xl border border-slate-200 bg-white p-0 text-slate-700 hover:border-teal-200 hover:text-teal-700"
              : `btn-primary px-3 ${fullWidth ? "w-full" : ""}`
          } transition duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none`}
        >
          <ShoppingCart className="size-4" aria-hidden="true" />
          {iconOnly ? (
            <span className="sr-only">
              {product.stock <= 0 ? "Out of stock" : "Add to cart"}
            </span>
          ) : product.stock <= 0 ? (
            "Out of stock"
          ) : (
            "Add to cart"
          )}
        </button>
        <button
          type="button"
          aria-label={
            iconOnly
              ? `${saved ? "Remove" : "Add"} ${product.title} ${saved ? "from" : "to"} wishlist`
              : undefined
          }
          aria-pressed={saved}
          title={saved ? "Remove from wishlist" : "Add to wishlist"}
          disabled={toggle.isPending}
          onClick={() => void toggleWishlist()}
          className={`${
            iconOnly
              ? "grid size-10 place-items-center rounded-xl border border-slate-200 bg-white p-0 text-slate-700"
              : `btn-secondary px-3 ${fullWidth ? "w-full" : ""}`
          } transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-600 hover:shadow-sm active:scale-[0.94] disabled:cursor-wait disabled:opacity-50 motion-reduce:transform-none`}
        >
          <Heart
            className={`size-4 ${saved ? "fill-red-500 text-red-500" : ""}`}
            aria-hidden="true"
          />
          {iconOnly ? (
            <span className="sr-only">{saved ? "Saved" : "Wishlist"}</span>
          ) : saved ? (
            "Saved to wishlist"
          ) : (
            "Add to wishlist"
          )}
        </button>
      </div>
      {feedback?.presentation === "inline" ? (
        <FeedbackAlert {...feedback} className="mt-3" />
      ) : null}
    </div>
  );
}
