// apps/web/src/features/orders/orders-page-content.tsx
"use client";

import type { OrderContract, OrderItemContract } from "@shopmind/contracts";
import { AlertTriangle, ArchiveX, CalendarDays, PackageCheck, RefreshCw, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useOrdersQuery } from "./orders.queries";
import { OrdersHistorySkeleton } from "./orders-page-skeleton";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function OrdersPageContent() {
  const orders = useOrdersQuery();

  if (orders.isPending) return <OrdersHistorySkeleton />;
  if (orders.isError) {
    return <OrdersErrorState isRetrying={orders.isFetching} retry={() => void orders.refetch()} />;
  }
  if (orders.data.items.length === 0) return <OrdersEmptyState />;

  return (
    <section aria-labelledby="order-history-title" className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
        <h2 id="order-history-title" className="font-bold text-slate-950">Order history</h2>
        <span className="inline-flex min-h-8 items-center rounded-full bg-teal-50 px-3 text-xs font-bold text-teal-800 ring-1 ring-inset ring-teal-100">
          {orders.data.items.length} {orders.data.items.length === 1 ? "order" : "orders"}
        </span>
      </div>

      <div className="divide-y divide-slate-200 px-5 sm:px-6 xl:hidden">
        {orders.data.items.map((order, index) => <OrderCard key={order.id} order={order} index={index} />)}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[1080px] table-fixed border-collapse text-left">
          <caption className="sr-only">Orders listed newest first with checkout-time item snapshots.</caption>
          <colgroup>
            <col className="w-[23%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[36%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-6 py-4">Order</th>
              <th scope="col" className="px-5 py-4">Date</th>
              <th scope="col" className="px-5 py-4">Status</th>
              <th scope="col" className="px-5 py-4">Items</th>
              <th scope="col" className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.data.items.map((order, index) => <OrderTableRow key={order.id} order={order} index={index} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderTableRow({ order, index }: { readonly order: OrderContract; readonly index: number }) {
  return (
    <tr className="animate-in fade-in slide-in-from-bottom-2 align-top transition-colors duration-200 hover:bg-teal-50/30 motion-reduce:animate-none" style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}>
      <td className="px-6 py-6"><OrderIdentifier id={order.id} showLabel={false} /></td>
      <td className="px-5 py-6"><OrderDate value={order.createdAt} /></td>
      <td className="px-5 py-6"><OrderStatus status={order.status} /></td>
      <td className="px-5 py-6"><OrderItems items={order.items} /></td>
      <td className="px-6 py-6 text-right text-base font-extrabold text-slate-950">{money.format(order.total)}</td>
    </tr>
  );
}

function OrderCard({ order, index }: { readonly order: OrderContract; readonly index: number }) {
  return (
    <article className="animate-in fade-in slide-in-from-bottom-2 py-6 duration-300 motion-reduce:animate-none" style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <OrderIdentifier id={order.id} />
        <OrderStatus status={order.status} />
      </div>
      <div className="mt-4"><OrderDate value={order.createdAt} /></div>
      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><OrderItems items={order.items} /></div>
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</span>
        <span className="text-xl font-extrabold tracking-tight text-slate-950">{money.format(order.total)}</span>
      </div>
    </article>
  );
}

function OrderIdentifier({ id, showLabel = true }: { readonly id: string; readonly showLabel?: boolean }) {
  return (
    <div className="min-w-0">
      {showLabel ? (
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <ShoppingBag className="size-3.5 text-teal-700" aria-hidden="true" /> Order
        </span>
      ) : null}
      <p className={`${showLabel ? "mt-2" : ""} break-all font-mono text-xs font-semibold leading-5 text-slate-900`}>{id}</p>
    </div>
  );
}

function OrderDate({ value }: { readonly value: string }) {
  return (
    <time dateTime={value} className="inline-flex items-start gap-2 text-sm leading-5 text-slate-600">
      <CalendarDays className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
      {dateTime.format(new Date(value))}
    </time>
  );
}

function OrderStatus({ status }: { readonly status: string }) {
  const knownCreatedStatus = status === "CREATED";
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold ring-1 ring-inset ${knownCreatedStatus ? "bg-blue-50 text-blue-800 ring-blue-100" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      <span className={`size-1.5 rounded-full ${knownCreatedStatus ? "bg-blue-600" : "bg-slate-500"}`} aria-hidden="true" />
      {status}
    </span>
  );
}

function OrderItems({ items }: { readonly items: readonly OrderItemContract[] }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <PackageCheck className="size-3.5 text-teal-700" aria-hidden="true" />
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
            <div className="min-w-0">
              <p className="font-semibold leading-5 text-slate-900">{item.productTitleSnapshot}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.quantity} × {money.format(item.unitPriceSnapshot)}</p>
            </div>
            <span className="text-sm font-bold text-slate-700">{money.format(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrdersEmptyState() {
  return (
    <section className="state-card py-12 sm:py-16">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100"><ArchiveX className="size-7" aria-hidden="true" /></span>
      <h2 className="mt-5 text-xl font-bold text-slate-950">No simulated orders yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Orders created through ShopMind&apos;s simulated checkout will appear here.</p>
      <Link href="/products" className="btn-primary mt-6"><ShoppingBag className="size-4" aria-hidden="true" />Browse products</Link>
    </section>
  );
}

function OrdersErrorState({ retry, isRetrying }: { readonly retry: () => void; readonly isRetrying: boolean }) {
  return (
    <section role="alert" className="surface-card border-red-200 bg-red-50/80 p-8 text-center sm:p-10">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-800"><AlertTriangle className="size-6" aria-hidden="true" /></span>
      <h2 className="mt-4 text-lg font-bold text-red-950">Order history unavailable</h2>
      <p className="mt-2 text-sm text-red-900">Order history is temporarily unavailable.</p>
      <button type="button" onClick={retry} disabled={isRetrying} className="btn-secondary mt-5 border-red-200 text-red-900">
        <RefreshCw className={`size-4 ${isRetrying ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        {isRetrying ? "Trying again..." : "Try again"}
      </button>
    </section>
  );
}
