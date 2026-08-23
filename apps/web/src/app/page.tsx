import { ArrowRight, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  ApiUnavailableState,
  EmptyCatalogState,
} from "@/components/catalog-states";
import { ProductGrid } from "@/features/products/product-grid";
import { ApiClientError, getCategories, getProducts } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  let catalog;
  let categories;
  try {
    [catalog, categories] = await Promise.all([
      getProducts({ page: 1, pageSize: 8, sort: "rating_desc" }),
      getCategories(),
    ]);
  } catch (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <ApiUnavailableState
          requestId={
            error instanceof ApiClientError ? error.requestId : undefined
          }
        />
      </main>
    );
  }

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <Sparkles className="size-4" aria-hidden="true" />
              Canonical product discovery
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Find products with less noise.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Browse ShopMind&apos;s local catalog by category, price, rating,
              and keyword.
            </p>
            <Link
              href="/products"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Browse catalog{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <form
            action="/products"
            className="self-center rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
          >
            <label
              htmlFor="landing-search"
              className="text-sm font-semibold text-slate-900"
            >
              Search the catalog
            </label>
            <div className="relative mt-3">
              <Search
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="landing-search"
                name="q"
                minLength={2}
                maxLength={200}
                required
                placeholder="Try laptop or a brand"
                className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <button className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              Search products
            </button>
          </form>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Explore</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Categories
            </h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-medium text-slate-700 hover:text-slate-950"
          >
            View all
          </Link>
        </div>
        {categories.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Categories will appear after catalog ingestion.
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500 hover:text-slate-950"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-950">
          Top-rated products
        </h2>
        <div className="mt-6">
          {catalog.items.length === 0 ? (
            <EmptyCatalogState />
          ) : (
            <ProductGrid products={catalog.items} />
          )}
        </div>
      </section>
    </main>
  );
}
