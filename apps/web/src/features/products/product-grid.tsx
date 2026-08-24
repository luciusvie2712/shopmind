import type { ProductSummaryContract } from "@shopmind/contracts";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  variant = "default",
  reviewCounts = {},
}: {
  readonly products: readonly ProductSummaryContract[];
  readonly variant?: "default" | "featured";
  readonly reviewCounts?: Readonly<Record<string, number>>;
}) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 md:grid-cols-3 ${
        variant === "featured" ? "lg:grid-cols-4 xl:grid-cols-6" : "lg:grid-cols-3 xl:grid-cols-4"
      }`}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={variant}
          reviewCount={reviewCounts[product.id]}
        />
      ))}
    </div>
  );
}
