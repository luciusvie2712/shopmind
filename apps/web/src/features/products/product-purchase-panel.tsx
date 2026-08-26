"use client";

import type { ProductSummaryContract } from "@shopmind/contracts";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { ProductActions } from "./product-actions";

export function ProductPurchasePanel({
  product,
}: {
  readonly product: ProductSummaryContract;
}) {
  const [quantity, setQuantity] = useState(1);
  const outOfStock = product.stock <= 0;

  function updateQuantity(rawValue: string): void {
    const nextValue = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(nextValue)) {
      setQuantity(1);
      return;
    }
    setQuantity(Math.min(Math.max(nextValue, 1), Math.max(product.stock, 1)));
  }

  return (
    <aside className="surface-card p-5 sm:p-6 xl:sticky xl:top-24">
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
          <ShoppingBag className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-extrabold text-slate-950">Purchase options</h2>
          <p className="mt-0.5 text-xs text-slate-500">Cart totals remain backend-authoritative.</p>
        </div>
      </div>

      <label htmlFor="product-quantity" className="mt-6 block text-sm font-bold text-slate-800">
        Quantity
      </label>
      <input
        id="product-quantity"
        type="number"
        inputMode="numeric"
        min={1}
        max={Math.max(product.stock, 1)}
        value={quantity}
        disabled={outOfStock}
        onChange={(event) => updateQuantity(event.target.value)}
        className="form-input mt-2 disabled:bg-slate-100"
      />
      <ProductActions product={product} quantity={quantity} fullWidth />
    </aside>
  );
}
