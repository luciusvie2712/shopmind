"use client";

import type { ProductSummaryContract } from "@shopmind/contracts";
import {
  AlertTriangle,
  Heart,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Star,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAddCartItem } from "@/features/cart/cart.queries";
import { FeedbackAlert } from "@/components/feedback/feedback-alert";
import { getErrorFeedback } from "@/lib/feedback";
import {
  useWishlistQuery,
  useWishlistToggle,
} from "./wishlist.queries";
import { WishlistWorkspaceSkeleton } from "./wishlist-page-skeleton";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function WishlistPageContent() {
  const wishlist = useWishlistQuery();
  const toggle = useWishlistToggle();
  const [mutationError, setMutationError] = useState<unknown>();

  if (wishlist.isPending) return <WishlistWorkspaceSkeleton />;
  if (wishlist.isError) {
    const feedback = getErrorFeedback(wishlist.error);
    if (feedback.presentation === "inline") return <FeedbackAlert {...feedback} />;
    return (
      <WishlistErrorState
        isRetrying={wishlist.isFetching}
        retry={() => void wishlist.refetch()}
      />
    );
  }

  async function removeProduct(product: ProductSummaryContract): Promise<void> {
    setMutationError(undefined);
    try {
      await toggle.mutateAsync({
        productId: product.id,
        product,
        add: false,
      });
    } catch (error) {
      setMutationError(error);
    }
  }

  const count = wishlist.data.items.length;

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <WishlistSummary count={count} />
        {count === 0 ? (
          <WishlistEmptyState />
        ) : (
          <section
            aria-labelledby="wishlist-items-title"
            className="surface-card min-w-0 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <h2 id="wishlist-items-title" className="font-bold text-slate-950">
                  Saved products
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {count} {count === 1 ? "item" : "items"}
                </p>
              </div>
              {wishlist.isFetching ? (
                <span role="status" className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700">
                  <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Refreshing
                </span>
              ) : null}
            </div>
            <div className="divide-y divide-slate-200 px-5 sm:px-6">
              {wishlist.data.items.map((product, index) => (
                <WishlistItem
                  key={product.id}
                  product={product}
                  index={index}
                  removePending={toggle.isPending}
                  onRemove={() => void removeProduct(product)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      {mutationError ? <WishlistMutationError error={mutationError} /> : null}
    </>
  );
}

function WishlistSummary({ count }: { readonly count: number }) {
  return (
    <aside
      aria-labelledby="wishlist-summary-title"
      className="surface-card p-6 text-center lg:sticky lg:top-24"
    >
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
        <Heart className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">{count}</p>
      <h2 id="wishlist-summary-title" className="mt-1 font-bold text-slate-950">
        {count === 1 ? "Saved item" : "Saved items"}
      </h2>
      <Link href="/products" className="btn-primary mt-7 min-h-12 w-full">
        <ShoppingBag className="size-4" aria-hidden="true" /> Browse products
      </Link>
    </aside>
  );
}

function WishlistItem({
  product,
  index,
  removePending,
  onRemove,
}: {
  readonly product: ProductSummaryContract;
  readonly index: number;
  readonly removePending: boolean;
  readonly onRemove: () => void;
}) {
  const cart = useAddCartItem();
  const [cartError, setCartError] = useState<unknown>();
  const cartFeedback = cartError ? getErrorFeedback(cartError) : undefined;
  const outOfStock = product.stock <= 0;

  async function addToCart(): Promise<void> {
    setCartError(undefined);
    try {
      await cart.mutateAsync({ productId: product.id, quantity: 1 });
    } catch (error) {
      setCartError(error);
    }
  }

  return (
    <article
      className="animate-in fade-in slide-in-from-bottom-2 grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-4 py-5 duration-300 motion-reduce:animate-none sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:gap-5 sm:py-6"
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${product.title}`}
        className="relative aspect-square overflow-hidden rounded-2xl bg-slate-50"
      >
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="104px"
            className="object-contain p-2 transition-transform duration-300 hover:scale-[1.025] motion-reduce:transform-none"
          />
        ) : (
          <span className="grid h-full place-items-center text-slate-400">
            <ShoppingBag className="size-6" aria-hidden="true" />
            <span className="sr-only">No product image available</span>
          </span>
        )}
      </Link>

      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <Heart className="mt-1 size-4 shrink-0 fill-red-500 text-red-500" aria-hidden="true" />
          <Link
            href={`/products/${product.id}`}
            className="line-clamp-2 font-bold leading-6 text-slate-950 transition-colors hover:text-teal-700"
          >
            {product.title}
          </Link>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {product.brand ? `${product.brand} · ` : ""}{product.category.name}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span>{product.rating.toFixed(1)}</span>
        </p>
        <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${outOfStock ? "text-red-700" : "text-emerald-700"}`}>
          <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
          {outOfStock ? "Out of stock" : `${product.stock} in stock`}
        </p>
        <p className="mt-3 text-lg font-extrabold text-slate-950 sm:hidden">
          {money.format(product.price)}
        </p>
      </div>

      <div className="col-span-2 flex flex-col items-stretch gap-2 border-t border-slate-100 pt-4 sm:col-span-1 sm:min-w-36 sm:items-end sm:border-0 sm:pt-0">
        <p className="hidden text-lg font-extrabold text-slate-950 sm:block">
          {money.format(product.price)}
        </p>
        <button
          type="button"
          disabled={outOfStock || cart.isPending}
          onClick={() => void addToCart()}
          className="btn-secondary min-h-11 w-full px-3 sm:mt-2 sm:w-auto"
        >
          {cart.isPending ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <ShoppingCart className="size-4" aria-hidden="true" />
          )}
          {outOfStock ? "Out of stock" : cart.isPending ? "Adding..." : "Add to cart"}
        </button>
        <button
          type="button"
          aria-label={`Remove ${product.title} from wishlist`}
          disabled={removePending}
          onClick={onRemove}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 motion-reduce:transform-none"
        >
          <Trash2 className="size-4" aria-hidden="true" /> Remove
        </button>
      </div>
      {cartFeedback?.presentation === "inline" ? (
        <FeedbackAlert {...cartFeedback} className="col-span-full" />
      ) : null}
    </article>
  );
}

function WishlistMutationError({ error }: { readonly error: unknown }) {
  const feedback = getErrorFeedback(error);
  return feedback.presentation === "inline" ? <FeedbackAlert {...feedback} className="mt-4" /> : null;
}

function WishlistEmptyState() {
  return (
    <section className="state-card py-14">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <PackageOpen className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-slate-950">No saved products yet</h2>
      <p className="mt-2 text-sm text-slate-600">
        Use the wishlist action on a product to save it here.
      </p>
      <Link href="/products" className="btn-primary mt-5">
        Browse products
      </Link>
    </section>
  );
}

function WishlistErrorState({
  retry,
  isRetrying,
}: {
  readonly retry: () => void;
  readonly isRetrying: boolean;
}) {
  return (
    <section role="alert" className="surface-card border-red-200 bg-red-50/80 p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-800">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-red-950">Wishlist unavailable</h2>
      <p className="mt-2 text-sm text-red-900">Wishlist is temporarily unavailable.</p>
      <button
        type="button"
        onClick={retry}
        disabled={isRetrying}
        className="btn-secondary mt-5 border-red-200 text-red-900"
      >
        <RefreshCw className={`size-4 ${isRetrying ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        {isRetrying ? "Trying again..." : "Try again"}
      </button>
    </section>
  );
}
