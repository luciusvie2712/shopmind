"use client";

import type { ProductSummaryContract } from "@shopmind/contracts";
import { GitCompareArrows } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Reveal } from "@/components/ui/reveal";
import { ProductCard } from "@/features/products/product-card";
import { FeedbackAlert } from "@/components/feedback/feedback-alert";

export function CompareSelection({
  products,
}: {
  readonly products: readonly ProductSummaryContract[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<readonly string[]>([]);

  function toggle(productId: string): void {
    setSelected((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : current.length < 4
          ? [...current, productId]
          : current,
    );
  }

  return (
    <section aria-label="Catalog products">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:text-sm">
          <GitCompareArrows className="size-4 text-indigo-600" aria-hidden="true" />
          Select 2–4 products to compare ({selected.length}/4)
        </p>
        <button
          type="button"
          disabled={selected.length < 2}
          onClick={() => router.push(`/compare?ids=${selected.join(",")}`)}
          className="btn-ai min-h-9 px-3 py-1.5 text-xs"
        >
          Compare selected
        </button>
      </div>

      {selected.length === 4 ? (
        <FeedbackAlert variant="warning" role="status" title="Comparison limit reached" description="You can compare up to 4 products. Remove one to select another." className="mb-4" />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product, index) => {
          const card = (
            <div className="relative h-full">
              <label className="absolute right-3 top-3 z-10 grid size-10 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:border-indigo-200 hover:text-indigo-700">
                <input
                  type="checkbox"
                  checked={selected.includes(product.id)}
                  disabled={
                    selected.length >= 4 && !selected.includes(product.id)
                  }
                  onChange={() => toggle(product.id)}
                  className="size-4 accent-indigo-600"
                />
                <span className="sr-only">Compare {product.title}</span>
              </label>
              <ProductCard product={product} />
            </div>
          );

          return index < 6 ? (
            <Reveal key={product.id} delay={index * 50} className="h-full">
              {card}
            </Reveal>
          ) : (
            <div key={product.id} className="h-full">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
