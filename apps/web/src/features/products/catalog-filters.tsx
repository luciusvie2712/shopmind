"use client";

import type { CategoryContract } from "@shopmind/contracts";
import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import {
  catalogSearchParams,
  type CatalogUrlState,
  parseCatalogSearchParams,
} from "./catalog-query";

interface CatalogFiltersProps {
  readonly categories: readonly CategoryContract[];
  readonly state: CatalogUrlState;
}

export function CatalogFilters({ categories, state }: CatalogFiltersProps) {
  const router = useRouter();
  const [clientError, setClientError] = useState<string>();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [isPending, startTransition] = useTransition();
  const formKey = JSON.stringify(state);

  useEffect(() => {
    if (clientError) errorRef.current?.focus();
  }, [clientError]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const candidate = parseCatalogSearchParams({
      q: String(formData.get("q") ?? ""),
      category: String(formData.get("category") ?? ""),
      minPrice: String(formData.get("minPrice") ?? ""),
      maxPrice: String(formData.get("maxPrice") ?? ""),
      sort: String(formData.get("sort") ?? ""),
      page: "1",
    });
    if (candidate.errors.length > 0) {
      setClientError(candidate.errors.join(" "));
      return;
    }

    setClientError(undefined);
    startTransition(() => {
      router.push(`/products?${catalogSearchParams(candidate.state, 1)}`);
    });
  }

  return (
    <form
      key={formKey}
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-label="Catalog filters"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Refine products
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="text-xs font-medium text-slate-600">Keyword</span>
          <span className="relative mt-1 block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              name="q"
              type="search"
              defaultValue={state.q}
              maxLength={200}
              placeholder="Laptop, phone, brand…"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </span>
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Category</span>
          <select
            name="category"
            defaultValue={state.category ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Min price</span>
          <input
            name="minPrice"
            inputMode="decimal"
            defaultValue={state.minPrice}
            placeholder="0"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Max price</span>
          <input
            name="maxPrice"
            inputMode="decimal"
            defaultValue={state.maxPrice}
            placeholder="1200"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Sort</span>
          <select
            name="sort"
            defaultValue={state.sort}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="rating">Rating: high to low</option>
            <option value="rating_asc">Rating: low to high</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Updating…" : "Apply filters"}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => router.push("/products"))}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        >
          Clear
        </button>
        <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm text-red-700 outline-none">
          {clientError}
        </p>
      </div>
    </form>
  );
}
