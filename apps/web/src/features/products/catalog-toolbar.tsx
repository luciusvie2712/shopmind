"use client";

import { ArrowUpDown, PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  catalogHref,
  type CatalogSortValue,
  type CatalogUrlState,
} from "./catalog-query";

const sortOptions: readonly {
  readonly value: CatalogSortValue;
  readonly label: string;
}[] = [
  { value: "rating", label: "Rating: high to low" },
  { value: "rating_asc", label: "Rating: low to high" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export function CatalogToolbar({
  state,
  total,
  pageSize,
  visibleCount,
}: {
  readonly state: CatalogUrlState;
  readonly total: number;
  readonly pageSize: number;
  readonly visibleCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const firstItem = total === 0 ? 0 : (state.page - 1) * pageSize + 1;
  const lastItem = Math.min(firstItem + visibleCount - 1, total);

  return (
    <div
      id="catalog-results"
      className="flex flex-col gap-4 border-y border-slate-200 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <PackageSearch className="size-4 text-teal-700" aria-hidden="true" />
        Showing <strong className="text-slate-950">{firstItem}–{lastItem}</strong> of{" "}
        <strong className="text-slate-950">{total} products</strong>
      </p>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 sm:text-sm">
        <ArrowUpDown className="size-4" aria-hidden="true" />
        Sort by
        <select
          aria-label="Sort"
          value={state.sort}
          disabled={isPending}
          onChange={(event) => {
            const sort = event.target.value as CatalogSortValue;
            startTransition(() => router.push(catalogHref({ ...state, sort }, 1)));
          }}
          className="form-select mt-0 h-10 w-auto min-w-48 pr-8 text-xs sm:text-sm"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
