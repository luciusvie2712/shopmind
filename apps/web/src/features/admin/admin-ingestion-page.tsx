"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import {
  getAdminIngestionStatus,
  triggerAdminProductIngestion,
} from "@/lib/api/client";
import { PageHeader, StatusBadge, SummaryGrid } from "./admin-resource-pages";
import { notify } from "@/lib/feedback";

export function AdminIngestionPage() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["admin", "ingestion", "status"],
    queryFn: getAdminIngestionStatus,
    refetchInterval: 10_000,
  });
  const trigger = useMutation({
    mutationFn: triggerAdminProductIngestion,
    onSuccess: async (result) => {
      notify("admin:ingestion", "success", "Ingestion job queued", {
        description: `Job ${result.jobId} was added to the product ingestion queue.`,
        icon: "checkout",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "ingestion"] });
    },
    onError: () =>
      notify("admin:ingestion", "error", "Couldn’t queue ingestion job", {
        description:
          "The existing catalog remains available. Please try again.",
        icon: "error",
      }),
  });

  function requestImport() {
    if (
      window.confirm(
        "Đồng bộ lại catalog từ DummyJSON? Tác vụ chạy bất đồng bộ và không xóa dữ liệu chuẩn.",
      )
    )
      trigger.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý ingestion"
        description="Theo dõi độ tươi catalog, độ phủ dữ liệu AI và hàng đợi worker. PostgreSQL vẫn là nguồn dữ liệu chuẩn sau khi import."
        action={
          <button
            type="button"
            onClick={requestImport}
            disabled={trigger.isPending}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw
              className={`size-4 ${trigger.isPending ? "animate-spin" : ""}`}
            />
            {trigger.isPending ? "Đang tạo job…" : "Đồng bộ sản phẩm"}
          </button>
        }
      />
      {status.isPending ? (
        <div className="skeleton-block h-80" />
      ) : status.isError || !status.data ? (
        <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-10 text-center shadow-[0_16px_40px_rgba(245,158,11,0.10)]">
          <TriangleAlert className="mx-auto size-8 text-amber-600" />
          <h2 className="mt-3 text-xl font-extrabold text-slate-950">
            Không thể đọc trạng thái ingestion
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Catalog công khai vẫn dùng PostgreSQL. Queue metrics có thể tạm thời
            không khả dụng.
          </p>
          <button
            type="button"
            className="btn-secondary mt-5"
            onClick={() => void status.refetch()}
          >
            Thử lại
          </button>
        </section>
      ) : (
        <IngestionContent data={status.data} />
      )}
    </div>
  );
}

function IngestionContent({
  data,
}: {
  readonly data: Awaited<ReturnType<typeof getAdminIngestionStatus>>;
}) {
  const coverage =
    data.catalog.products === 0
      ? 0
      : Math.round((data.catalog.embedded / data.catalog.products) * 100);
  return (
    <>
      <SummaryGrid
        items={[
          {
            label: "Tổng sản phẩm",
            value: data.catalog.products,
            tone: "teal",
          },
          { label: "Đang hoạt động", value: data.catalog.active, tone: "blue" },
          {
            label: "Source missing",
            value: data.catalog.sourceMissing,
            tone: "rose",
          },
          { label: "Embedding coverage", value: `${coverage}%`, tone: "amber" },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/80 p-6 shadow-[0_16px_45px_rgba(37,99,235,0.08)]">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-16 size-40 rounded-full bg-blue-300/20 blur-2xl"
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                Worker queues
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Snapshot tự cập nhật mỗi 10 giây.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 text-sm font-bold ${data.jobs.available ? "text-emerald-700" : "text-amber-700"}`}
            >
              <Activity className="size-4" />
              {data.jobs.available ? "Redis connected" : "Metrics unavailable"}
            </span>
          </div>
          {!data.jobs.available ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Không đọc được Redis queue metrics. Dữ liệu catalog trong
              PostgreSQL vẫn khả dụng.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <QueueRow
                name="Product ingestion"
                metrics={data.jobs.ingestion}
              />
              <QueueRow
                name="Product embedding"
                metrics={data.jobs.embedding}
              />
              <QueueRow
                name="Review summary"
                metrics={data.jobs.reviewSummary}
              />
            </div>
          )}
        </section>
        <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/80 p-6 shadow-[0_16px_45px_rgba(16,185,129,0.08)]">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-16 size-40 rounded-full bg-emerald-300/20 blur-2xl"
          />
          <h2 className="text-lg font-extrabold text-slate-950">
            Catalog health
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <HealthRow
              icon={<Database className="size-4" />}
              label="Canonical store"
              value="PostgreSQL"
            />
            <HealthRow
              icon={<Clock3 className="size-4" />}
              label="Cập nhật sản phẩm gần nhất"
              value={
                data.catalog.lastProductUpdatedAt
                  ? new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(data.catalog.lastProductUpdatedAt))
                  : "Chưa có dữ liệu"
              }
            />
            <HealthRow
              icon={<CheckCircle2 className="size-4" />}
              label="Embedding"
              value={`${data.catalog.embedded.toLocaleString()} / ${data.catalog.products.toLocaleString()}`}
            />
          </dl>
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/70 p-6 shadow-[0_16px_45px_rgba(13,148,136,0.08)]">
          <h2 className="text-lg font-extrabold text-slate-950">
            Sản phẩm theo nguồn
          </h2>
          {data.catalog.sources.length ? (
            <BarList
              items={data.catalog.sources.map((item) => ({
                label: item.source,
                value: item.products,
              }))}
            />
          ) : (
            <Empty text="Chưa có nguồn sản phẩm." />
          )}
        </section>
        <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/70 p-6 shadow-[0_16px_45px_rgba(124,58,237,0.08)]">
          <h2 className="text-lg font-extrabold text-slate-950">
            Review summaries
          </h2>
          {data.catalog.reviewSummaries.length ? (
            <div className="mt-5 space-y-3">
              {data.catalog.reviewSummaries.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <StatusBadge value={item.status} />
                  <strong>{item.products.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Chưa có review summary." />
          )}
        </section>
      </div>
    </>
  );
}

function QueueRow({
  name,
  metrics,
}: {
  readonly name: string;
  readonly metrics?: {
    readonly waiting: number;
    readonly active: number;
    readonly completed: number;
    readonly failed: number;
  };
}) {
  if (!metrics) return null;
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md motion-reduce:transform-none">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900">{name}</p>
        <span
          className={
            metrics.failed
              ? "text-sm font-bold text-rose-700"
              : "text-sm font-bold text-emerald-700"
          }
        >
          {metrics.failed ? `${metrics.failed} failed` : "Healthy"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <QueueMetric label="Waiting" value={metrics.waiting} />
        <QueueMetric label="Active" value={metrics.active} />
        <QueueMetric label="Done" value={metrics.completed} />
        <QueueMetric label="Failed" value={metrics.failed} danger />
      </div>
    </div>
  );
}
function QueueMetric({
  label,
  value,
  danger = false,
}: {
  readonly label: string;
  readonly value: number;
  readonly danger?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2 shadow-sm ${danger && value ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-gradient-to-br from-slate-50 to-white"}`}
    >
      <p
        className={`text-lg font-extrabold ${danger && value ? "text-rose-700" : "text-slate-900"}`}
      >
        {value}
      </p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}
function HealthRow({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white bg-white/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
        {icon}
      </span>
      <dt className="flex-1 text-slate-500">{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  );
}
function BarList({
  items,
}: {
  readonly items: readonly { readonly label: string; readonly value: number }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="mt-6 space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-semibold text-slate-700">{item.label}</span>
            <strong>{item.value.toLocaleString()}</strong>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-[width] duration-700"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
function Empty({ text }: { readonly text: string }) {
  return (
    <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
      {text}
    </p>
  );
}
