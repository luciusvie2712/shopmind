"use client";

import type {
  AdminAiLogListContract,
  AdminListQueryContract,
  AdminOrderListContract,
  AdminPaginationContract,
  AdminPaymentListContract,
  AdminProductListContract,
  AdminUserListContract,
} from "@shopmind/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Search,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  getAdminAiLogs,
  getAdminOrders,
  getAdminPayments,
  getAdminProducts,
  getAdminUsers,
} from "@/lib/api/client";

type AdminUser = AdminUserListContract["items"][number];
type AdminOrder = AdminOrderListContract["items"][number];
type AdminPayment = AdminPaymentListContract["items"][number];
type AdminProduct = AdminProductListContract["items"][number];
type AdminAiLog = AdminAiLogListContract["items"][number];

interface Column<T> {
  readonly label: string;
  readonly cell: (item: T) => ReactNode;
  readonly align?: "right";
}

interface SummaryItem {
  readonly label: string;
  readonly value: string | number;
  readonly tone?: "teal" | "blue" | "amber" | "rose";
}

interface ResourceProps<
  T extends { readonly id: string },
  D extends AdminPaginationContract & { readonly items: readonly T[] },
> {
  readonly title: string;
  readonly description: string;
  readonly resource: string;
  readonly query: (input: AdminListQueryContract) => Promise<D>;
  readonly searchPlaceholder: string;
  readonly statusLabel?: string;
  readonly statuses?: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly columns: readonly Column<T>[];
  readonly summary: (data: D) => readonly SummaryItem[];
  readonly emptyMessage: string;
}

const adminFilterSchema = z.object({
  search: z.string().trim().max(100),
  status: z.string().max(50),
});
type AdminFilterValues = z.infer<typeof adminFilterSchema>;

export function AdminUsersPage() {
  return (
    <AdminResourceList<AdminUser, AdminUserListContract>
      title="Quản lý người dùng"
      description="Theo dõi tài khoản, vai trò và mức độ tương tác từ dữ liệu người dùng chuẩn."
      resource="users"
      query={getAdminUsers}
      searchPlaceholder="Tìm theo tên hoặc email…"
      statusLabel="Vai trò"
      statuses={[
        { value: "USER", label: "User" },
        { value: "ADMIN", label: "Admin" },
      ]}
      summary={(data) => [
        { label: "Tổng tài khoản", value: data.summary.users, tone: "teal" },
        { label: "Quản trị viên", value: data.summary.admins, tone: "blue" },
        {
          label: "Người dùng",
          value: data.summary.users - data.summary.admins,
          tone: "amber",
        },
      ]}
      columns={[
        {
          label: "Người dùng",
          cell: (item) => <Person name={item.name} email={item.email} />,
        },
        { label: "Vai trò", cell: (item) => <StatusBadge value={item.role} /> },
        { label: "Đơn hàng", cell: (item) => item.orderCount.toLocaleString() },
        { label: "Sự kiện", cell: (item) => item.eventCount.toLocaleString() },
        { label: "Ngày tham gia", cell: (item) => formatDate(item.createdAt) },
      ]}
      emptyMessage="Không tìm thấy tài khoản phù hợp."
    />
  );
}

export function AdminOrdersPage() {
  return (
    <AdminResourceList<AdminOrder, AdminOrderListContract>
      title="Quản lý đơn hàng"
      description="Đối soát đơn hàng, giá trị và trạng thái thanh toán từ dữ liệu giao dịch chuẩn."
      resource="orders"
      query={getAdminOrders}
      searchPlaceholder="Tìm mã đơn, tên hoặc email…"
      statusLabel="Trạng thái đơn"
      statuses={[
        { value: "CREATED", label: "Created" },
        { value: "PAID", label: "Paid" },
        { value: "PAYMENT_FAILED", label: "Payment failed" },
      ]}
      summary={(data) => [
        { label: "Tổng đơn hàng", value: data.summary.orders, tone: "teal" },
        {
          label: "Tổng giá trị",
          value: formatMoney(data.summary.orderValue),
          tone: "blue",
        },
        {
          label: "Giá trị trung bình",
          value: formatMoney(
            data.summary.orders
              ? data.summary.orderValue / data.summary.orders
              : 0,
          ),
          tone: "amber",
        },
      ]}
      columns={[
        { label: "Mã đơn", cell: (item) => <Code value={item.id} /> },
        {
          label: "Khách hàng",
          cell: (item) => (
            <Person name={item.customer.name} email={item.customer.email} />
          ),
        },
        {
          label: "Trạng thái",
          cell: (item) => <StatusBadge value={item.status} />,
        },
        {
          label: "Thanh toán",
          cell: (item) =>
            item.paymentStatus ? (
              <StatusBadge value={item.paymentStatus} />
            ) : (
              <span className="text-slate-400">Chưa có</span>
            ),
        },
        { label: "Sản phẩm", cell: (item) => item.itemCount },
        {
          label: "Tổng tiền",
          align: "right",
          cell: (item) => <strong>{formatMoney(item.total)}</strong>,
        },
        { label: "Thời gian", cell: (item) => formatDateTime(item.createdAt) },
      ]}
      emptyMessage="Không có đơn hàng phù hợp với bộ lọc."
    />
  );
}

export function AdminPaymentsPage() {
  const paymentStatuses = [
    "REQUIRES_PAYMENT",
    "PROCESSING",
    "SUCCEEDED",
    "FAILED",
    "CANCELED",
  ].map((value) => ({ value, label: value.replaceAll("_", " ") }));
  return (
    <AdminResourceList<AdminPayment, AdminPaymentListContract>
      title="Quản lý thanh toán"
      description="Theo dõi vòng đời thanh toán Stripe; không hiển thị client secret hoặc dữ liệu nhạy cảm."
      resource="payments"
      query={getAdminPayments}
      searchPlaceholder="Tìm mã payment, order hoặc email…"
      statusLabel="Trạng thái"
      statuses={paymentStatuses}
      summary={(data) => [
        {
          label: "Tổng thanh toán",
          value: data.summary.payments,
          tone: "teal",
        },
        { label: "Thành công", value: data.summary.succeeded, tone: "blue" },
        { label: "Thất bại", value: data.summary.failed, tone: "rose" },
        {
          label: "Giá trị thành công",
          value: formatMoney(data.summary.succeededValue),
          tone: "amber",
        },
      ]}
      columns={[
        { label: "Payment", cell: (item) => <Code value={item.id} /> },
        { label: "Order", cell: (item) => <Code value={item.orderId} /> },
        {
          label: "Khách hàng",
          cell: (item) => (
            <Person name={item.customer.name} email={item.customer.email} />
          ),
        },
        { label: "Provider", cell: (item) => item.provider },
        {
          label: "Trạng thái",
          cell: (item) => <StatusBadge value={item.status} />,
        },
        {
          label: "Số tiền",
          align: "right",
          cell: (item) => (
            <strong>{formatMoney(item.amount, item.currency)}</strong>
          ),
        },
        { label: "Cập nhật", cell: (item) => formatDateTime(item.updatedAt) },
      ]}
      emptyMessage="Không có thanh toán phù hợp với bộ lọc."
    />
  );
}

export function AdminProductsPage() {
  return (
    <AdminResourceList<AdminProduct, AdminProductListContract>
      title="Quản lý sản phẩm"
      description="Kiểm tra catalog chuẩn, tồn kho, trạng thái nguồn và độ phủ AI embedding."
      resource="products"
      query={getAdminProducts}
      searchPlaceholder="Tìm tên, brand hoặc external ID…"
      statusLabel="Trạng thái nguồn"
      statuses={[
        { value: "ACTIVE", label: "Active" },
        { value: "SOURCE_MISSING", label: "Source missing" },
      ]}
      summary={(data) => [
        { label: "Tổng sản phẩm", value: data.summary.products, tone: "teal" },
        { label: "Đang hoạt động", value: data.summary.active, tone: "blue" },
        { label: "Hết hàng", value: data.summary.outOfStock, tone: "rose" },
        { label: "Đã embedding", value: data.summary.embedded, tone: "amber" },
      ]}
      columns={[
        {
          label: "Sản phẩm",
          cell: (item) => (
            <Link
              href={`/products/${item.id}`}
              className="group/product flex items-center gap-3"
            >
              <ProductThumbnail src={item.thumbnail} title={item.title} />
              <div className="min-w-0">
                <p className="max-w-xs truncate font-bold text-slate-900 transition group-hover/product:text-teal-800">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.brand ?? "Không brand"} · {item.category}
                </p>
              </div>
            </Link>
          ),
        },
        {
          label: "Nguồn",
          cell: (item) => (
            <div>
              <p className="font-semibold">{item.source}</p>
              <p className="text-xs text-slate-500">{item.externalId}</p>
            </div>
          ),
        },
        {
          label: "Trạng thái",
          cell: (item) => <StatusBadge value={item.sourceStatus} />,
        },
        {
          label: "Giá",
          align: "right",
          cell: (item) => formatMoney(item.price),
        },
        { label: "Rating", cell: (item) => item.rating.toFixed(1) },
        {
          label: "Tồn kho",
          cell: (item) => (
            <span className={item.stock === 0 ? "font-bold text-rose-700" : ""}>
              {item.stock}
            </span>
          ),
        },
        {
          label: "AI",
          cell: (item) => (
            <div className="flex flex-col gap-1">
              <StatusBadge value={item.hasEmbedding ? "EMBEDDED" : "MISSING"} />
              {item.reviewSummaryStatus ? (
                <span className="text-xs text-slate-500">
                  Review: {item.reviewSummaryStatus}
                </span>
              ) : null}
            </div>
          ),
        },
        { label: "Cập nhật", cell: (item) => formatDateTime(item.updatedAt) },
      ]}
      emptyMessage="Không có sản phẩm phù hợp với bộ lọc."
    />
  );
}

export function AdminAiLogsPage() {
  return (
    <AdminResourceList<AdminAiLog, AdminAiLogListContract>
      title="AI request logs"
      description="Quan sát operation, model, token, latency và trạng thái; nội dung prompt không được đưa lên dashboard."
      resource="ai-logs"
      query={getAdminAiLogs}
      searchPlaceholder="Tìm operation hoặc model…"
      statusLabel="Trạng thái"
      statuses={[
        { value: "success", label: "Success" },
        { value: "fallback", label: "Fallback" },
        { value: "failed", label: "Failed" },
      ]}
      summary={(data) => [
        { label: "Tổng request", value: data.summary.requests, tone: "teal" },
        { label: "Request lỗi", value: data.summary.failures, tone: "rose" },
        {
          label: "Latency trung bình",
          value: `${Math.round(data.summary.averageLatencyMs)} ms`,
          tone: "blue",
        },
        {
          label: "Tổng token",
          value: data.summary.totalTokens.toLocaleString(),
          tone: "amber",
        },
      ]}
      columns={[
        {
          label: "Operation",
          cell: (item) => (
            <div>
              <p className="font-bold text-slate-900">{item.operation}</p>
              <p className="mt-1 text-xs text-slate-500">{item.model}</p>
            </div>
          ),
        },
        {
          label: "Trạng thái",
          cell: (item) => <StatusBadge value={item.status} />,
        },
        {
          label: "Người dùng",
          cell: (item) =>
            item.user ? (
              <Person name={item.user.name} email={item.user.email} />
            ) : (
              <span className="text-slate-400">Anonymous/system</span>
            ),
        },
        {
          label: "Input",
          align: "right",
          cell: (item) => item.inputTokens?.toLocaleString() ?? "—",
        },
        {
          label: "Output",
          align: "right",
          cell: (item) => item.outputTokens?.toLocaleString() ?? "—",
        },
        {
          label: "Latency",
          align: "right",
          cell: (item) => `${Math.round(item.latencyMs)} ms`,
        },
        { label: "Thời gian", cell: (item) => formatDateTime(item.createdAt) },
      ]}
      emptyMessage="Chưa có AI request log phù hợp."
    />
  );
}

function AdminResourceList<
  T extends { readonly id: string },
  D extends AdminPaginationContract & { readonly items: readonly T[] },
>(props: ResourceProps<T, D>) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminFilterValues>({
    search: "",
    status: "",
  });
  const form = useForm<AdminFilterValues>({
    defaultValues: { search: "", status: "" },
  });
  const input = {
    page,
    pageSize: 20,
    search: filters.search || undefined,
    status: filters.status || undefined,
  };
  const result = useQuery({
    queryKey: ["admin", props.resource, input],
    queryFn: () => props.query(input),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  function submit(values: AdminFilterValues) {
    const parsed = adminFilterSchema.safeParse(values);
    if (!parsed.success) return;
    setPage(1);
    setFilters(parsed.data);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={props.title} description={props.description} />
      {result.data ? (
        <SummaryGrid items={props.summary(result.data)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="skeleton-block h-28" />
          <div className="skeleton-block h-28" />
          <div className="skeleton-block h-28" />
        </div>
      )}
      <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-teal-50/60 p-4 sm:flex-row"
        >
          <label className="relative flex-1">
            <span className="sr-only">Tìm kiếm</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              {...form.register("search")}
              placeholder={props.searchPlaceholder}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 pl-10 pr-4 text-sm shadow-sm outline-none transition duration-200 hover:border-teal-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100/80"
            />
          </label>
          {props.statuses ? (
            <label>
              <span className="sr-only">{props.statusLabel}</span>
              <select
                {...form.register("status")}
                onChange={(event) => {
                  form.setValue("status", event.target.value);
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }));
                  setPage(1);
                }}
                className="h-11 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-100/80"
              >
                <option value="">
                  Tất cả {props.statusLabel?.toLowerCase()}
                </option>
                {props.statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button className="btn-primary h-11" type="submit">
            Tìm kiếm
          </button>
        </form>
        {result.isPending ? (
          <div className="p-6">
            <div
              className="skeleton-block h-72"
              aria-label="Đang tải dữ liệu quản trị"
            />
          </div>
        ) : result.isError || !result.data ? (
          <AdminError retry={() => void result.refetch()} />
        ) : result.data.items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-bold text-slate-900">Không có dữ liệu</p>
            <p className="mt-2 text-sm text-slate-500">{props.emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-slate-100 via-slate-50 to-teal-50 text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    {props.columns.map((column) => (
                      <th
                        key={column.label}
                        className={`whitespace-nowrap px-5 py-3.5 font-bold ${column.align === "right" ? "text-right" : ""}`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="transition duration-200 hover:bg-gradient-to-r hover:from-teal-50/70 hover:via-white hover:to-cyan-50/60"
                    >
                      {props.columns.map((column) => (
                        <td
                          key={column.label}
                          className={`whitespace-nowrap px-5 py-4 text-slate-700 ${column.align === "right" ? "text-right" : ""}`}
                        >
                          {column.cell(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination data={result.data} setPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/80 to-cyan-100/60 px-6 py-7 shadow-[0_16px_50px_rgba(13,148,136,0.10)] sm:flex sm:items-end sm:justify-between sm:gap-4 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-gradient-to-br from-cyan-300/35 to-blue-400/20 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 left-1/3 -z-10 size-48 rounded-full bg-teal-300/20 blur-3xl"
      />
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/75 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700 shadow-sm backdrop-blur">
          <Sparkles className="size-3.5" aria-hidden="true" /> Operations
        </p>
        <h1 className="mt-3 bg-gradient-to-r from-slate-950 via-teal-950 to-cyan-800 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
      {action ? <div className="mt-5 shrink-0 sm:mt-0">{action}</div> : null}
    </header>
  );
}

export function SummaryGrid({
  items,
}: {
  readonly items: readonly SummaryItem[];
}) {
  const tones = {
    teal: "from-teal-500 to-cyan-500",
    blue: "from-blue-500 to-indigo-500",
    amber: "from-amber-400 to-orange-500",
    rose: "from-rose-500 to-pink-500",
  };
  const surfaces = {
    teal: "from-teal-50 via-white to-cyan-50 hover:border-teal-300",
    blue: "from-blue-50 via-white to-indigo-50 hover:border-blue-300",
    amber: "from-amber-50 via-white to-orange-50 hover:border-amber-300",
    rose: "from-rose-50 via-white to-pink-50 hover:border-rose-300",
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] motion-reduce:transform-none ${surfaces[item.tone ?? "teal"]}`}
        >
          <span
            className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${tones[item.tone ?? "teal"]}`}
          />
          <span
            aria-hidden="true"
            className={`absolute -right-6 -top-8 size-24 rounded-full bg-gradient-to-br opacity-10 blur-sm transition duration-300 group-hover:scale-125 group-hover:opacity-20 ${tones[item.tone ?? "teal"]}`}
          />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {item.label}
          </p>
          <p className="mt-3 text-2xl font-extrabold text-slate-950">
            {typeof item.value === "number"
              ? item.value.toLocaleString()
              : item.value}
          </p>
        </article>
      ))}
    </div>
  );
}

export function StatusBadge({ value }: { readonly value: string }) {
  const normalized = value.toUpperCase();
  const positive = [
    "ADMIN",
    "ACTIVE",
    "SUCCEEDED",
    "SUCCESS",
    "READY",
    "EMBEDDED",
    "PAID",
  ].includes(normalized);
  const negative = [
    "FAILED",
    "CANCELED",
    "PAYMENT_FAILED",
    "SOURCE_MISSING",
    "MISSING",
  ].includes(normalized);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold shadow-sm ${positive ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-100 text-emerald-800" : negative ? "border-rose-200 bg-gradient-to-r from-rose-50 to-pink-100 text-rose-800" : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-100 text-amber-800"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Pagination({
  data,
  setPage,
}: {
  readonly data: AdminPaginationContract;
  readonly setPage: (page: number) => void;
}) {
  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.page * data.pageSize, data.total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 px-5 py-4 text-sm sm:flex-row">
      <p className="text-slate-500">
        Hiển thị{" "}
        <strong className="text-slate-800">
          {from}–{to}
        </strong>{" "}
        / {data.total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={data.page <= 1}
          onClick={() => setPage(data.page - 1)}
          className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 font-bold text-slate-700">
          {data.page} / {Math.max(1, data.totalPages)}
        </span>
        <button
          type="button"
          disabled={data.page >= data.totalPages}
          onClick={() => setPage(data.page + 1)}
          className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function AdminError({ retry }: { readonly retry: () => void }) {
  return (
    <div className="p-12 text-center">
      <p className="font-extrabold text-slate-900">
        Không thể tải dữ liệu quản trị
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Kiểm tra API hoặc quyền truy cập rồi thử lại.
      </p>
      <button type="button" onClick={retry} className="btn-secondary mt-5">
        Thử lại
      </button>
    </div>
  );
}

function Person({
  name,
  email,
}: {
  readonly name: string;
  readonly email: string;
}) {
  return (
    <div>
      <p className="font-bold text-slate-900">{name}</p>
      <p className="mt-1 text-xs text-slate-500">{email}</p>
    </div>
  );
}
function ProductThumbnail({
  src,
  title,
}: {
  readonly src: string | null;
  readonly title: string;
}) {
  return (
    <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-teal-50 shadow-sm transition duration-300 group-hover/product:scale-105 group-hover/product:border-teal-300 group-hover/product:shadow-md motion-reduce:transform-none">
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes="56px"
          className="object-contain p-1.5"
        />
      ) : (
        <ImageIcon className="size-5 text-slate-400" aria-hidden="true" />
      )}
    </div>
  );
}
function Code({ value }: { readonly value: string }) {
  return (
    <code
      title={value}
      className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700"
    >
      {value.slice(0, 8)}…
    </code>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
}
