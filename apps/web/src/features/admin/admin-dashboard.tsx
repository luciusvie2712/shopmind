"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Boxes,
  CreditCard,
  MousePointerClick,
  PackageOpen,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/features/auth/auth-provider";
import { getAdminAnalyticsOverview } from "@/lib/api/client";

export function AdminDashboard() {
  const { user } = useAuth();
  const analytics = useQuery({
    queryKey: ["admin", "analytics", 30],
    queryFn: () => getAdminAnalyticsOverview(30),
    enabled: user?.role === "ADMIN",
    refetchInterval: 30_000,
  });

  if (user?.role !== "ADMIN") {
    return (
      <AdminState
        title="Access denied"
        detail="This dashboard is restricted to ShopMind administrators."
      />
    );
  }
  if (analytics.isPending)
    return (
      <div
        className="skeleton-block h-80"
        aria-label="Loading admin analytics"
      />
    );
  if (analytics.isError || !analytics.data) {
    return (
      <AdminState
        title="Analytics unavailable"
        detail="Public shopping remains available. Retry the operational dashboard shortly."
      />
    );
  }
  const data = analytics.data;
  const cards = [
    {
      label: "Active products",
      value: data.catalog.activeProducts,
      icon: Boxes,
      surface: "from-teal-500 to-cyan-500",
      glow: "bg-teal-400",
    },
    {
      label: "Behavior events",
      value:
        data.events.productViews +
        data.events.searchClicks +
        data.events.cartAdditions,
      icon: MousePointerClick,
      surface: "from-blue-500 to-indigo-500",
      glow: "bg-blue-400",
    },
    {
      label: "AI requests",
      value: data.ai.requests,
      icon: Bot,
      surface: "from-violet-500 to-fuchsia-500",
      glow: "bg-violet-400",
    },
    {
      label: "Orders",
      value: data.commerce.orders,
      icon: CreditCard,
      surface: "from-amber-400 to-orange-500",
      glow: "bg-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, surface, glow }) => (
          <article
            key={label}
            className="group relative isolate overflow-hidden rounded-2xl border border-white/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.14)] motion-reduce:transform-none"
          >
            <span
              aria-hidden="true"
              className={`absolute -right-8 -top-10 -z-10 size-28 rounded-full opacity-15 blur-2xl transition duration-300 group-hover:scale-125 group-hover:opacity-25 ${glow}`}
            />
            <span
              className={`inline-grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${surface}`}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 bg-gradient-to-r from-slate-950 to-slate-600 bg-clip-text text-3xl font-extrabold text-transparent">
              {value.toLocaleString()}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="group relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50 p-6 shadow-[0_14px_40px_rgba(13,148,136,0.08)] transition hover:shadow-[0_18px_48px_rgba(13,148,136,0.13)]">
          <h2 className="text-lg font-extrabold text-slate-950">
            Hành vi người dùng
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tương tác ghi nhận trong 30 ngày gần nhất.
          </p>
          <HorizontalBars
            items={[
              { label: "Product views", value: data.events.productViews },
              { label: "Search clicks", value: data.events.searchClicks },
              { label: "Cart additions", value: data.events.cartAdditions },
            ]}
          />
        </section>
        <section className="group relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50 p-6 shadow-[0_14px_40px_rgba(124,58,237,0.08)] transition hover:shadow-[0_18px_48px_rgba(124,58,237,0.13)]">
          <h2 className="text-lg font-extrabold text-slate-950">
            Độ tin cậy AI
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tỷ lệ request thành công và fallback so với lỗi.
          </p>
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <DonutChart value={data.ai.successes} total={data.ai.requests} />
            <dl className="grid min-w-48 gap-3 text-sm">
              <Metric label="Successful" value={data.ai.successes} />
              <Metric label="Failed" value={data.ai.failures} />
            </dl>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-6 shadow-[0_14px_40px_rgba(37,99,235,0.07)]">
          <h2 className="text-lg font-extrabold text-slate-950">
            Discovery and AI
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <Metric label="Product views" value={data.events.productViews} />
            <Metric label="Search clicks" value={data.events.searchClicks} />
            <Metric label="Cart additions" value={data.events.cartAdditions} />
            <Metric
              label="AI success rate"
              value={
                data.ai.requests === 0
                  ? "—"
                  : `${Math.round((data.ai.successes / data.ai.requests) * 100)}%`
              }
            />
            <Metric
              label="AI average latency"
              value={`${Math.round(data.ai.averageLatencyMs)} ms`}
            />
            <Metric
              label="AI p95 latency"
              value={`${Math.round(data.ai.p95LatencyMs)} ms`}
            />
          </dl>
        </section>
        <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-6 shadow-[0_14px_40px_rgba(245,158,11,0.07)]">
          <h2 className="text-lg font-extrabold text-slate-950">
            Catalog and workers
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <Metric
              label="Embedding coverage"
              value={`${Math.round(data.catalog.embeddingCoverage * 100)}%`}
            />
            <Metric
              label="Stale embeddings"
              value={data.catalog.staleEmbeddings}
            />
            <Metric
              label="Source missing"
              value={data.catalog.sourceMissingProducts}
            />
            <Metric label="Categories" value={data.catalog.categories} />
          </dl>
          <p
            className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${data.jobs.available ? "text-emerald-700" : "text-amber-700"}`}
          >
            <Activity className="size-4" aria-hidden="true" />
            {data.jobs.available
              ? "Queue metrics connected"
              : "Queue metrics temporarily unavailable"}
          </p>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-teal-950 to-cyan-900 p-6 text-white">
          <h2 className="text-lg font-extrabold">Top products by behavior</h2>
        </div>
        {data.events.topProducts.length === 0 ? (
          <p className="p-6 text-sm text-slate-600">
            No behavior events in this 30-day window.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.events.topProducts.map(({ product, events }) => (
              <li
                key={product.id}
                className="group transition duration-200 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50/60"
              >
                <Link
                  href={`/products/${product.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-teal-50 shadow-sm transition duration-300 group-hover:scale-105 group-hover:border-teal-300 group-hover:shadow-md motion-reduce:transform-none">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail}
                          alt={product.title}
                          fill
                          sizes="56px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <PackageOpen className="size-5 text-slate-400" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900 transition group-hover:text-teal-800">
                        {product.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {product.brand ?? "Independent"} ·{" "}
                        {product.category.name}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-gradient-to-r from-teal-100 to-cyan-100 px-3 py-1.5 text-sm font-bold text-teal-800 shadow-sm">
                    {events} events
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HorizontalBars({
  items,
}: {
  readonly items: readonly { readonly label: string; readonly value: number }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div
      className="mt-6 space-y-5"
      role="img"
      aria-label="Biểu đồ tương tác người dùng"
    >
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-600">{item.label}</span>
            <strong className="text-slate-950">
              {item.value.toLocaleString()}
            </strong>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 shadow-[0_0_14px_rgba(6,182,212,0.45)] transition-[width] duration-700"
              style={{
                width: `${item.value === 0 ? 0 : Math.max(3, (item.value / max) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  value,
  total,
}: {
  readonly value: number;
  readonly total: number;
}) {
  const percentage = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div
      className="relative grid size-36 place-items-center rounded-full shadow-[0_15px_35px_rgba(124,58,237,0.16)] ring-8 ring-white"
      style={{
        background: `conic-gradient(rgb(124 58 237) ${percentage * 0.65}%, rgb(6 182 212) ${percentage}%, rgb(226 232 240) 0)`,
      }}
      role="img"
      aria-label={`AI success rate ${percentage}%`}
    >
      <div className="grid size-24 place-items-center rounded-full bg-white text-center">
        <div>
          <p className="text-2xl font-extrabold text-slate-950">
            {percentage}%
          </p>
          <p className="text-xs font-semibold text-slate-500">success</p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white bg-white/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-extrabold text-slate-900">{value}</dd>
    </div>
  );
}

function AdminState({
  title,
  detail,
}: {
  readonly title: string;
  readonly detail: string;
}) {
  return (
    <section className="surface-card p-8 text-center">
      <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </section>
  );
}
