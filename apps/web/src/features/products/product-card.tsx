import type { ProductSummaryContract } from "@shopmind/contracts";
import { ArrowUpRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductActions } from "./product-actions";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function ProductCard({
  product,
  showActions = true,
}: {
  product: ProductSummaryContract;
  readonly showActions?: boolean;
}) {
  const isOutOfStock = product.stock <= 0;

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md motion-reduce:transform-none">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain p-6 transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-400">
              No image available
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
            {product.category.name}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {product.brand ?? "Independent"}
              </p>
              <h3 className="mt-1 line-clamp-2 font-semibold leading-6 text-slate-950">
                {product.title}
              </h3>
            </div>
            <ArrowUpRight
              className="mt-1 size-4 shrink-0 text-slate-400 transition group-hover:text-slate-900"
              aria-hidden="true"
            />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-lg font-semibold text-slate-950">
              {priceFormatter.format(product.price)}
            </p>
            <span className="flex items-center gap-1 text-sm text-slate-600">
              <Star
                className="size-4 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              {product.rating.toFixed(1)}
            </span>
          </div>
          <p
            className={`mt-2 text-xs font-medium ${isOutOfStock ? "text-red-700" : "text-emerald-700"}`}
          >
            {isOutOfStock ? "Out of stock" : `${product.stock} in stock`}
          </p>
        </div>
      </Link>
      {showActions ? (
        <div className="px-5 pb-5">
          <ProductActions product={product} compact />
        </div>
      ) : null}
    </article>
  );
}
