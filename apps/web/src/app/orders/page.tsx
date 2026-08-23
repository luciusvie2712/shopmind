"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { useOrdersQuery } from "@/features/orders/orders.queries";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <ProtectedRoute>
        <OrdersContent />
      </ProtectedRoute>
    </main>
  );
}

function OrdersContent() {
  const orders = useOrdersQuery();
  if (orders.isPending)
    return <div role="status" aria-label="Orders loading" className="h-72 animate-pulse rounded-2xl bg-slate-200" />;
  if (orders.isError)
    return (
      <section
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-8"
      >
        <p>Order history is temporarily unavailable.</p>
        <button
          onClick={() => void orders.refetch()}
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </section>
    );
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Orders
      </h1>
      <div className="mt-8 space-y-5">
        {orders.data.items.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">No simulated orders yet</h2>
            <Link
              href="/products"
              className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              Browse products
            </Link>
          </section>
        ) : (
          orders.data.items.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="break-all font-mono text-xs text-slate-500">{order.id}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-700">
                    {order.status}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {money.format(order.total)}
                  </p>
                </div>
              </div>
              <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <span>
                      <strong>{item.productTitleSnapshot}</strong>
                      <span className="ml-2 text-slate-500">
                        {item.quantity} × {money.format(item.unitPriceSnapshot)}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium">{money.format(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
    </>
  );
}
