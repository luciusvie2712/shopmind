"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/features/auth/protected-route";
import {
  useCartQuery,
  useCheckout,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/features/cart/cart.queries";
import { ApiClientError } from "@/lib/api/client";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function CartPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <ProtectedRoute>
        <CartContent />
      </ProtectedRoute>
    </main>
  );
}

function CartContent() {
  const router = useRouter();
  const cart = useCartQuery();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const checkout = useCheckout();
  const mutationError = update.error ?? remove.error ?? checkout.error;
  if (cart.isPending)
    return <div role="status" aria-label="Cart loading" className="h-72 animate-pulse rounded-2xl bg-slate-200" />;
  if (cart.isError)
    return (
      <ErrorState
        message="The cart is temporarily unavailable."
        retry={() => void cart.refetch()}
      />
    );
  if (cart.data.items.length === 0)
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link
          href="/products"
          className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
        >
          Browse products
        </Link>
      </section>
    );

  async function createOrder() {
    try {
      await checkout.mutateAsync();
      router.push("/orders");
    } catch {
      /* rendered below */
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Your cart
      </h1>
      <div className="mt-8 space-y-4">
        {cart.data.items.map((item) => (
          <article
            key={item.id}
            className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-5 sm:p-5"
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:size-24">
              {item.product.thumbnail ? (
                <Image
                  src={item.product.thumbnail}
                  alt={item.product.title}
                  fill
                  sizes="96px"
                  className="object-contain p-2"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.product.id}`}
                className="font-semibold text-slate-950"
              >
                {item.product.title}
              </Link>
              <p className="mt-1 text-sm text-slate-600">
                {money.format(item.unitPrice)} each · {item.product.stock} in
                stock
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  aria-label={`Decrease quantity for ${item.product.title}`}
                  disabled={item.quantity <= 1 || update.isPending}
                  onClick={() =>
                    update.mutate({
                      productId: item.product.id,
                      quantity: item.quantity - 1,
                    })
                  }
                  className="size-8 rounded border border-slate-300"
                >
                  −
                </button>
                <span
                  aria-label={`Quantity for ${item.product.title}`}
                  aria-live="polite"
                  className="min-w-8 text-center text-sm"
                >
                  {item.quantity}
                </span>
                <button
                  aria-label={`Increase quantity for ${item.product.title}`}
                  disabled={
                    item.quantity >= item.product.stock || update.isPending
                  }
                  onClick={() =>
                    update.mutate({
                      productId: item.product.id,
                      quantity: item.quantity + 1,
                    })
                  }
                  className="size-8 rounded border border-slate-300"
                >
                  +
                </button>
                <button
                  aria-label={`Remove ${item.product.title} from cart`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(item.product.id)}
                  className="ml-2 text-sm font-medium text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
            <p className="col-span-2 border-t border-slate-100 pt-3 text-right font-semibold text-slate-950 sm:col-span-1 sm:border-0 sm:pt-0">
              {money.format(item.lineTotal)}
            </p>
          </article>
        ))}
      </div>
      {mutationError ? (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {mutationError instanceof ApiClientError &&
          mutationError.code === "OUT_OF_STOCK"
            ? "Stock changed. The cart has been restored to canonical server data."
            : mutationError instanceof Error
              ? mutationError.message
              : "Shopping operation failed."}
        </p>
      ) : null}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{money.format(cart.data.subtotal)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{money.format(cart.data.total)}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Simulated checkout only. No payment will be processed.
        </p>
        <button
          disabled={checkout.isPending}
          onClick={() => void createOrder()}
          className="mt-5 w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {checkout.isPending ? "Creating order..." : "Create simulated order"}
        </button>
      </section>
    </>
  );
}

function ErrorState({
  message,
  retry,
}: {
  readonly message: string;
  readonly retry: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
    >
      <p className="text-red-900">{message}</p>
      <button
        onClick={retry}
        className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </section>
  );
}
