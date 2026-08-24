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
  variant = "default",
  reviewCount,
}: {
  readonly product: ProductSummaryContract;
  readonly showActions?: boolean;
  readonly variant?: "default" | "featured";
  readonly reviewCount?: number;
}) {
  const isOutOfStock = product.stock <= 0;
  const featured = variant === "featured";

  return (
    <article className="group min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_14px_30px_rgba(15,23,42,0.09)] motion-reduce:transform-none">
      <Link href={`/products/${product.id}`} className="block">
        <div
          className={`relative overflow-hidden bg-slate-50 ${featured ? "aspect-[1.08/1]" : "aspect-[4/3]"}`}
        >
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes={
                featured
                  ? "(min-width: 1280px) 16vw, (min-width: 768px) 33vw, 50vw"
                  : "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              }
              className={`${featured ? "p-4" : "p-6"} object-contain transition duration-300 group-hover:scale-[1.035]`}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-400">
              No image available
            </div>
          )}
          {!featured ? (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
              {product.category.name}
            </span>
          ) : null}
        </div>
        <div className={featured ? "px-4 pb-1 pt-4" : "p-5"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {!featured ? (
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {product.brand ?? "Independent"}
                </p>
              ) : null}
              <h3 className={`${featured ? "text-[15px] leading-5" : "mt-1 leading-6"} line-clamp-2 font-bold text-slate-950`}>
                {product.title}
              </h3>
            </div>
            <ArrowUpRight
              className="mt-1 size-4 shrink-0 text-slate-400 transition group-hover:text-slate-900"
              aria-hidden="true"
            />
          </div>
          <div className={`${featured ? "mt-2 flex-col items-start" : "mt-4 items-end justify-between"} flex gap-2`}>
            <span className="flex items-center gap-1 text-sm text-slate-600">
              <Star
                className="size-4 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              {product.rating.toFixed(1)}
              {reviewCount !== undefined ? (
                <span className="text-slate-400">({reviewCount})</span>
              ) : null}
            </span>
            <p className={`${featured ? "text-lg" : "text-lg"} font-bold text-slate-950`}>
              {priceFormatter.format(product.price)}
            </p>
          </div>
          <p
            className={`mt-2 text-xs font-medium ${isOutOfStock ? "text-red-700" : "text-emerald-700"}`}
          >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-current align-middle" />
            {isOutOfStock ? "Out of stock" : "In stock"}
          </p>
        </div>
      </Link>
      {showActions ? (
        <div className={featured ? "px-4 pb-4" : "px-5 pb-5"}>
          <ProductActions product={product} compact iconOnly={featured} />
        </div>
      ) : null}
    </article>
  );
}
