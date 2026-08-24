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
  iconOnly = false,
}: {
  readonly product: ProductSummaryContract;
  readonly compact?: boolean;
  readonly iconOnly?: boolean;
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
      <div className={`flex flex-wrap gap-2 ${iconOnly ? "justify-end" : ""}`}>
        <button
          type="button"
          aria-label={iconOnly ? `Add ${product.title} to cart` : undefined}
          title={product.stock <= 0 ? "Out of stock" : "Add to cart"}
          disabled={product.stock <= 0 || cart.isPending}
          onClick={() => void addToCart()}
          className={`${
            iconOnly
              ? "grid size-9 place-items-center rounded-lg border border-slate-200 bg-white p-0 text-slate-700"
              : "inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white"
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
              ? "grid size-9 place-items-center rounded-lg border border-slate-200 bg-white p-0 text-slate-700"
              : "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
          } transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-600 hover:shadow-sm active:scale-[0.94] disabled:cursor-wait disabled:opacity-50 motion-reduce:transform-none`}
        >
          <Heart
            className={`size-4 ${saved ? "fill-red-500 text-red-500" : ""}`}
            aria-hidden="true"
          />
          {iconOnly ? (
            <span className="sr-only">{saved ? "Saved" : "Wishlist"}</span>
          ) : saved ? (
            "Saved"
          ) : (
            "Wishlist"
          )}
        </button>
      </div>
      {message ? (
        <p
          role={messageIsError ? "alert" : "status"}
          className={`${iconOnly ? "sr-only" : "mt-2 text-xs"} ${messageIsError ? "text-red-700" : "text-slate-600"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
