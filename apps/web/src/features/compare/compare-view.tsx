"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ApiClientError, compareProducts } from "@/lib/api/client";
import { CompareSkeleton } from "./compare-skeleton";
import { CompareWorkspace } from "./compare-workspace";

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
  const router = useRouter();
  const parsed = parseCompareIds(rawIds);
  const productIds = parsed.success ? parsed.data : [];
  const comparison = useQuery({
    queryKey: ["ai-compare", productIds],
    queryFn: () => compareProducts({ productIds }),
    enabled: parsed.success,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  if (!parsed.success) {
    return (
      <section
        role="alert"
        className="surface-card border-amber-200 bg-amber-50/80 p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-amber-950">
              Invalid comparison selection
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              {parsed.error.issues[0]?.message ??
                "Choose 2–4 unique products."}
            </p>
            <Link href="/products" className="btn-secondary mt-4">
              Choose products
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (comparison.isPending) {
    return <CompareSkeleton productCount={productIds.length} />;
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
      <section
        role="alert"
        className="surface-card border-red-200 bg-red-50/80 p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-800">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-red-950">Comparison unavailable</h2>
            <p className="mt-1 text-sm leading-6 text-red-900">{message}</p>
            <button
              type="button"
              onClick={() => void comparison.refetch()}
              disabled={comparison.isFetching}
              className="btn-secondary mt-4 border-red-200 text-red-900 hover:border-red-300 hover:text-red-800"
            >
              {comparison.isFetching ? (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              {comparison.isFetching ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  function removeProduct(productId: string): void {
    const remainingIds = productIds.filter((id) => id !== productId);
    router.push(
      remainingIds.length > 0
        ? `/compare?ids=${remainingIds.join(",")}`
        : "/compare",
    );
  }

  return (
    <CompareWorkspace
      comparison={comparison.data}
      isRefreshing={comparison.isFetching}
      onRemoveProduct={removeProduct}
      onRetrySummary={() => void comparison.refetch()}
    />
  );
}
