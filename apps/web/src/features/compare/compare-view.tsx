"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { z } from "zod";
import { ApiClientError, compareProducts } from "@/lib/api/client";

const compareIdsSchema = z
  .array(z.string().uuid())
  .min(2, "Select at least 2 products")
  .max(4, "Select no more than 4 products")
  .refine((ids) => new Set(ids).size === ids.length, "Product IDs must be unique");

export function parseCompareIds(rawIds: string | undefined) {
  return compareIdsSchema.safeParse(
    rawIds
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [],
  );
}

export function CompareView({ rawIds }: { readonly rawIds?: string }) {
  const parsed = parseCompareIds(rawIds);
  const comparison = useQuery({
    queryKey: ["ai-compare", parsed.success ? parsed.data : []],
    queryFn: () => compareProducts({ productIds: parsed.success ? parsed.data : [] }),
    enabled: parsed.success,
    retry: false,
  });

  if (!parsed.success) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-8">
        <h2 className="font-semibold text-amber-950">Invalid comparison selection</h2>
        <p className="mt-2 text-sm text-amber-900">
          {parsed.error.issues[0]?.message ?? "Choose 2–4 unique products."}
        </p>
      </section>
    );
  }
  if (comparison.isPending) {
    return (
      <div aria-label="Comparison loading" className="space-y-4">
        <LoaderCircle className="size-6 animate-spin text-indigo-700" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }
  if (comparison.isError) {
    const error = comparison.error;
    const message =
      error instanceof ApiClientError && error.code === "PRODUCT_NOT_FOUND"
        ? "One or more selected products no longer exist."
        : error instanceof ApiClientError && error.code === "API_UNAVAILABLE"
          ? "The ShopMind API is unavailable."
          : "Comparison could not be loaded.";
    return (
      <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <p className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="size-4" aria-hidden="true" /> {message}
        </p>
        <button
          type="button"
          onClick={() => void comparison.refetch()}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-800"
        >
          <RefreshCw className="size-4" aria-hidden="true" /> Retry
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <div
        role="region"
        aria-label="Product comparison table"
        tabIndex={0}
        className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"
      >
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">
            Canonical facts for the selected ShopMind products
          </caption>
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Fact</th>
              {comparison.data.products.map((product) => (
                <th key={product.id} className="min-w-48 px-4 py-3 text-left">
                  {product.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <ComparisonRow label="Brand" values={comparison.data.products.map((p) => p.brand ?? "Unknown")} />
            <ComparisonRow label="Category" values={comparison.data.products.map((p) => p.category.name)} />
            <ComparisonRow label="Price" values={comparison.data.products.map((p) => `$${p.price.toFixed(2)}`)} />
            <ComparisonRow label="Rating" values={comparison.data.products.map((p) => p.rating.toFixed(1))} />
            <ComparisonRow label="Stock" values={comparison.data.products.map((p) => String(p.stock))} />
          </tbody>
        </table>
      </div>

      {comparison.data.status === "success" && comparison.data.summary ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="font-semibold text-indigo-950">Grounded AI summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {comparison.data.summary}
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-950">AI summary unavailable</h2>
          <p className="mt-2 text-sm text-amber-900">
            Canonical comparison facts remain available. No summary was fabricated.
          </p>
          <button
            type="button"
            onClick={() => void comparison.refetch()}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-900"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Retry summary
          </button>
        </section>
      )}
      <p className="text-xs text-slate-400">Request ID: {comparison.data.requestId}</p>
    </div>
  );
}

function ComparisonRow({
  label,
  values,
}: {
  readonly label: string;
  readonly values: readonly string[];
}) {
  return (
    <tr>
      <th className="bg-slate-50 px-4 py-3 text-left font-medium text-slate-700">{label}</th>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="px-4 py-3 text-slate-700">
          {value}
        </td>
      ))}
    </tr>
  );
}
