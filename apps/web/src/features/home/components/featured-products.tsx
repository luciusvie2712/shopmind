import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductGrid } from "@/features/products/product-grid";
import type { HomeCatalogData } from "@/features/home/types";
import { CompactDataState } from "./compact-data-state";

export function FeaturedProducts({
  state,
}: {
  readonly state: HomeCatalogData["products"];
}) {
  return (
    <section aria-labelledby="featured-products-title" className="home-section py-14 lg:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id="featured-products-title" className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Featured Products
        </h2>
        <Link href="/products" className="group inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-500">
          View all products
          <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
        </Link>
      </div>
      {state.status === "error" ? (
        <CompactDataState
          kind="error"
          message="Featured products are temporarily unavailable."
          requestId={state.requestId}
        />
      ) : state.status === "empty" ? (
        <CompactDataState kind="empty" message="No featured products available." />
      ) : (
        <ProductGrid
          products={state.items}
          variant="featured"
          reviewCounts={state.reviewCounts}
        />
      )}
    </section>
  );
}
