"use client";

import type { ProductSummaryContract } from "@shopmind/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductCard } from "@/features/products/product-card";

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
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-sm text-indigo-950">
          Select 2–4 products to compare ({selected.length}/4).
        </p>
        <button
          type="button"
          disabled={selected.length < 2}
          onClick={() => router.push(`/compare?ids=${selected.join(",")}`)}
          className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Compare selected
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(product.id)}
                disabled={selected.length >= 4 && !selected.includes(product.id)}
                onChange={() => toggle(product.id)}
              />
              Compare {product.title}
            </label>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
