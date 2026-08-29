"use client";

import type { OrderContract, OrderItemContract } from "@shopmind/contracts";
import {
  AlertTriangle,
  ArchiveX,
  ArrowUpRight,
  CalendarDays,
  CircleCheckBig,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useOrdersQuery } from "./orders.queries";
import { OrdersHistorySkeleton } from "./orders-page-skeleton";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function OrdersPageContent() {
  const orders = useOrdersQuery();

  if (orders.isPending) return <OrdersHistorySkeleton />;
  if (orders.isError) {
    return <OrdersErrorState isRetrying={orders.isFetching} retry={() => void orders.refetch()} />;
  }
  if (orders.data.items.length === 0) return <OrdersEmptyState />;

  const itemCount = orders.data.items.reduce((total, order) => total + order.items.length, 0);

  return (
    <section aria-labelledby="order-history-title" className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50/70 px-5 py-5 shadow-[0_16px_45px_rgba(15,118,110,0.08)] sm:px-7 sm:py-6">
        <div aria-hidden="true" className="absolute -right-16 -top-20 size-52 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-700/15">
              <ReceiptText className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 id="order-history-title" className="text-lg font-extrabold text-slate-950">Order history</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">Checkout-time titles and prices are preserved for every order.</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:min-w-64">
            <SummaryMetric label="Orders" value={orders.data.items.length} />
            <SummaryMetric label="Products" value={itemCount} />
          </dl>
        </div>
      </div>

      <div className="space-y-5">
        {orders.data.items.map((order, index) => <OrderCard key={order.id} order={order} index={index} />)}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-center shadow-sm backdrop-blur">
      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-black tracking-tight text-teal-800">{value}</dd>
    </div>
  );
}

function OrderCard({ order, index }: { readonly order: OrderContract; readonly index: number }) {
  const createdAt = new Date(order.createdAt);
  const shortId = order.id.split("-")[0]?.toUpperCase() ?? order.id;

  return (
    <article
      className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_38px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_18px_48px_rgba(15,118,110,0.11)] motion-reduce:transform-none motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
    >
      <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-teal-50/70 px-5 py-5 sm:px-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(180px,0.8fr)] sm:items-center lg:grid-cols-[minmax(0,1.1fr)_minmax(190px,0.65fr)_minmax(150px,0.5fr)_minmax(150px,0.5fr)]">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-teal-100 bg-white text-teal-700 shadow-sm">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Order number</p>
              <p className="mt-1 font-mono text-base font-extrabold text-slate-950" title={order.id}>#{shortId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:justify-self-end lg:justify-self-start">
            <CalendarDays className="size-4 shrink-0 text-teal-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-800">{date.format(createdAt)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{time.format(createdAt)}</p>
            </div>
          </div>

          <div className="sm:justify-self-start"><OrderStatus status={order.status} /></div>

          <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-4 sm:col-span-2 lg:col-span-1 lg:block lg:border-0 lg:pt-0 lg:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Order total</p>
            <p className="text-xl font-black tracking-tight text-slate-950 lg:mt-1">{money.format(order.total)}</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="hidden grid-cols-[minmax(0,1fr)_130px] gap-6 border-b border-slate-100 px-2 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:grid">
          <span>Product</span><span className="text-right">Amount</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => <OrderItemRow key={item.id} item={item} />)}
        </ul>
      </div>

      <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="flex items-center gap-2">
          <PackageCheck className="size-4 text-teal-700" aria-hidden="true" />
          {order.items.length} {order.items.length === 1 ? "product" : "products"} in this order
        </p>
        <div className="flex items-center gap-4"><p>Subtotal <strong className="ml-2 text-sm text-slate-800">{money.format(order.subtotal)}</strong></p><Link href={`/orders/${order.id}`} className="font-bold text-teal-700">Xem chi tiết →</Link></div>
      </footer>
    </article>
  );
}

function OrderItemRow({ item }: { readonly item: OrderItemContract }) {
  return (
    <li className="grid min-w-0 gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_130px] sm:items-center sm:gap-6 sm:px-2 sm:py-5">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href={`/products/${item.productId}`}
          className="group/image relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50 shadow-sm sm:size-[72px]"
          aria-label={`View ${item.productTitleSnapshot}`}
        >
          {item.productThumbnail ? (
            <Image src={item.productThumbnail} alt="" fill sizes="72px" className="object-contain p-2 transition-transform duration-300 group-hover/image:scale-105" />
          ) : (
            <ShoppingBag className="size-6 text-teal-700" aria-hidden="true" />
          )}
        </Link>
        <div className="min-w-0">
          <Link href={`/products/${item.productId}`} className="group/title inline-flex max-w-full items-center gap-1.5 font-bold leading-5 text-slate-900 transition-colors hover:text-teal-700">
            <span className="truncate">{item.productTitleSnapshot}</span>
            <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100" aria-hidden="true" />
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">Qty {item.quantity}</span>
            <span aria-hidden="true">×</span><span>{money.format(item.unitPriceSnapshot)} each</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
        <span className="text-xs font-semibold text-slate-500 sm:hidden">Line total</span>
        <span className="text-base font-extrabold text-slate-950">{money.format(item.lineTotal)}</span>
      </div>
    </li>
  );
}

function OrderStatus({ status }: { readonly status: string }) {
  const created = status === "CREATED";
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-extrabold ring-1 ring-inset ${created ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      <CircleCheckBig className="size-3.5" aria-hidden="true" />{created ? "Order created" : status}
    </span>
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
