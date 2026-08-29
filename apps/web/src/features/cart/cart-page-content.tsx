"use client";

import type { CartContract, CartItemContract } from "@shopmind/contracts";
import {
  AlertTriangle,
  LoaderCircle,
  LockKeyhole,
  Minus,
  PackageOpen,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCartQuery,
  useCheckout,
  useRemoveCartItem,
  useUpdateCartItem,
} from "./cart.queries";
import { CartWorkspaceSkeleton } from "./cart-page-skeleton";
import { FeedbackAlert } from "@/components/feedback/feedback-alert";
import { getErrorFeedback } from "@/lib/feedback";
import { StripeTestCheckout } from "./stripe-test-checkout";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function CartPageContent() {
  const router = useRouter();
  const cart = useCartQuery();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const checkout = useCheckout();
  const mutationError = update.error ?? remove.error ?? checkout.error;

  function resetErrors(): void {
    update.reset();
    remove.reset();
    checkout.reset();
  }

  const errorFeedback = mutationError
    ? getErrorFeedback(mutationError)
    : undefined;
  const errorBanner =
    errorFeedback &&
    (checkout.isError || errorFeedback.presentation === "inline") ? (
      <FeedbackAlert {...errorFeedback} className="mt-4" />
    ) : null;

  if (cart.isPending) return <CartWorkspaceSkeleton />;
  if (cart.isError) {
    const feedback = getErrorFeedback(cart.error);
    if (feedback.presentation === "inline")
      return <FeedbackAlert {...feedback} />;
    return (
      <CartErrorState
        isRetrying={cart.isFetching}
        retry={() => void cart.refetch()}
      />
    );
  }
  if (cart.data.items.length === 0)
    return (
      <>
        <CartEmptyState />
        {errorBanner}
      </>
    );

  async function createOrder(): Promise<void> {
    resetErrors();
    try {
      await checkout.mutateAsync();
      router.push("/orders");
    } catch {
      // The mutation state renders the authoritative backend error below.
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
      <section aria-labelledby="cart-items-title" className="min-w-0">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div>
              <h2 id="cart-items-title" className="font-bold text-slate-950">
                Cart items
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {cart.data.items.length}{" "}
                {cart.data.items.length === 1 ? "item" : "items"}
              </p>
            </div>
            {cart.isFetching ? (
              <span
                role="status"
                className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700"
              >
                <LoaderCircle
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Refreshing
              </span>
            ) : null}
          </div>
          <div className="divide-y divide-slate-200 px-4 sm:px-6">
            {cart.data.items.map((item, index) => (
              <CartItemRow
                key={item.id}
                item={item}
                index={index}
                updatePending={update.isPending}
                removePending={remove.isPending}
                onUpdate={(quantity) => {
                  resetErrors();
                  update.mutate({ productId: item.product.id, quantity });
                }}
                onRemove={() => {
                  resetErrors();
                  remove.mutate({
                    productId: item.product.id,
                    product: item.product,
                  });
                }}
              />
            ))}
          </div>
        </div>

        {errorBanner}
      </section>

      <CartSummary
        cart={cart.data}
        checkoutPending={checkout.isPending}
        onCheckout={() => void createOrder()}
      />
    </div>
  );
}

function CartItemRow({
  item,
  index,
  updatePending,
  removePending,
  onUpdate,
  onRemove,
}: {
  readonly item: CartItemContract;
  readonly index: number;
  readonly updatePending: boolean;
  readonly removePending: boolean;
  readonly onUpdate: (quantity: number) => void;
  readonly onRemove: () => void;
}) {
  const isOutOfStock = item.product.stock <= 0;

  return (
    <article
      className="animate-in fade-in slide-in-from-bottom-2 grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-4 py-5 duration-300 motion-reduce:animate-none sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-5 sm:py-6"
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
    >
      <Link
        href={`/products/${item.product.id}`}
        aria-label={`View ${item.product.title}`}
        className="relative aspect-square overflow-hidden rounded-2xl bg-slate-50"
      >
        {item.product.thumbnail ? (
          <Image
            src={item.product.thumbnail}
            alt={item.product.title}
            fill
            sizes="112px"
            className="object-contain p-2 transition-transform duration-300 hover:scale-[1.02] motion-reduce:transform-none"
          />
        ) : (
          <span className="grid h-full place-items-center text-slate-400">
            <ShoppingBag className="size-6" aria-hidden="true" />
            <span className="sr-only">No product image available</span>
          </span>
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href={`/products/${item.product.id}`}
          className="line-clamp-2 font-bold leading-6 text-slate-950 transition-colors hover:text-teal-700"
        >
          {item.product.title}
        </Link>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {item.product.brand ? `${item.product.brand} · ` : ""}
          {item.product.category.name}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-800 sm:hidden">
          {money.format(item.lineTotal)}
        </p>
        <p
          className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${isOutOfStock ? "text-red-700" : "text-emerald-700"}`}
        >
          <span
            className="inline-block size-1.5 rounded-full bg-current"
            aria-hidden="true"
          />
          {isOutOfStock ? "Out of stock" : `${item.product.stock} in stock`}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <button
              type="button"
              aria-label={`Decrease quantity for ${item.product.title}`}
              disabled={item.quantity <= 1 || updatePending}
              onClick={() => onUpdate(item.quantity - 1)}
              className="grid size-11 place-items-center text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:text-slate-300 motion-reduce:transform-none"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span
              aria-label={`Quantity for ${item.product.title}`}
              aria-live="polite"
              className="grid min-w-11 place-items-center border-x border-slate-200 px-2 text-sm font-bold text-slate-900"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Increase quantity for ${item.product.title}`}
              disabled={item.quantity >= item.product.stock || updatePending}
              onClick={() => onUpdate(item.quantity + 1)}
              className="grid size-11 place-items-center text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:text-slate-300 motion-reduce:transform-none"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            aria-label={`Remove ${item.product.title} from cart`}
            disabled={removePending}
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 motion-reduce:transform-none"
          >
            <Trash2 className="size-4" aria-hidden="true" /> Remove
          </button>
        </div>
      </div>

      <div className="col-span-2 flex items-end justify-between gap-4 border-t border-slate-100 pt-4 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <div className="text-right">
          <p className="hidden text-lg font-extrabold text-slate-950 sm:block">
            {money.format(item.lineTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {money.format(item.unitPrice)} each
          </p>
        </div>
      </div>
    </article>
  );
}

function CartSummary({
  cart,
  checkoutPending,
  onCheckout,
}: {
  readonly cart: CartContract;
  readonly checkoutPending: boolean;
  readonly onCheckout: () => void;
}) {
  return (
    <aside
      aria-labelledby="order-summary-title"
      className="surface-card p-5 lg:sticky lg:top-24 sm:p-6"
    >
      <h2 id="order-summary-title" className="text-lg font-bold text-slate-950">
        Order summary
      </h2>
      <dl className="mt-7 space-y-4">
        <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
          <dt>Subtotal</dt>
          <dd className="font-semibold text-slate-900">
            {money.format(cart.subtotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5 text-lg">
          <dt className="font-bold text-slate-950">Total</dt>
          <dd className="text-xl font-extrabold text-slate-950">
            {money.format(cart.total)}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        disabled={checkoutPending}
        onClick={onCheckout}
        className="btn-primary mt-7 min-h-12 w-full"
      >
        {checkoutPending ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <LockKeyhole className="size-4" aria-hidden="true" />
        )}
        {checkoutPending ? "Creating order..." : "Create simulated order"}
      </button>
      <div className="mt-5 flex items-start gap-3 rounded-xl bg-teal-50 p-4 text-xs leading-5 text-teal-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Simulated checkout only. No payment will be processed.</p>
      </div>
      <StripeTestCheckout />
    </aside>
  );
}

function CartEmptyState() {
  return (
    <section className="state-card py-14">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
        <PackageOpen className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-slate-950">
        Your cart is empty
      </h2>
      <Link href="/products" className="btn-primary mt-5">
        Browse products
      </Link>
    </section>
  );
}

function CartErrorState({
  retry,
  isRetrying,
}: {
  readonly retry: () => void;
  readonly isRetrying: boolean;
}) {
  return (
    <section
      role="alert"
      className="surface-card border-red-200 bg-red-50/80 p-8 text-center"
    >
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-800">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-red-950">Cart unavailable</h2>
      <p className="mt-2 text-sm text-red-900">
        The cart is temporarily unavailable.
      </p>
      <button
        type="button"
        onClick={retry}
        disabled={isRetrying}
        className="btn-secondary mt-5 border-red-200 text-red-900"
      >
        <RefreshCw
          className={`size-4 ${isRetrying ? "animate-spin motion-reduce:animate-none" : ""}`}
          aria-hidden="true"
        />
        {isRetrying ? "Trying again..." : "Try again"}
      </button>
    </section>
  );
}
