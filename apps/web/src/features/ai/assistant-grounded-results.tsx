import type { ProductSummaryContract } from "@shopmind/contracts";
import { ArrowRight, CheckCircle2, GitCompareArrows, PackageSearch, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function AssistantGroundedResults({
  products,
}: {
  readonly products: readonly ProductSummaryContract[];
}) {
  const compareHref =
    products.length >= 2 && products.length <= 4
      ? `/compare?ids=${products.map((product) => product.id).join(",")}`
      : undefined;

  return (
    <aside aria-labelledby="grounded-results-title" className="surface-card overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center gap-2 text-teal-700">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          <h2 id="grounded-results-title" className="font-bold text-slate-950">Grounded results</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Canonical products referenced by the latest response.</p>
      </div>

      {products.length === 0 ? (
        <div className="grid min-h-64 place-items-center p-6 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <PackageSearch className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-800">No grounded products yet</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Referenced canonical products will appear after an assistant response.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          {products.map((product, index) => (
            <GroundedProductCard key={product.id} product={product} index={index} />
          ))}
          {compareHref ? (
            <Link href={compareHref} className="btn-secondary w-full">
              <GitCompareArrows className="size-4" aria-hidden="true" />
              Compare grounded products
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      )}
    </aside>
  );
}

function GroundedProductCard({
  product,
  index,
}: {
  readonly product: ProductSummaryContract;
  readonly index: number;
}) {
  const isOutOfStock = product.stock <= 0;

  return (
    <article
      className="animate-in fade-in slide-in-from-bottom-2 group rounded-2xl border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-card-hover motion-reduce:animate-none motion-reduce:transform-none"
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
    >
      <div className="flex gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-600 text-xs font-extrabold text-white">{index + 1}</span>
        <Link href={`/products/${product.id}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-50">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="80px"
              className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
            />
          ) : (
            <span className="grid h-full place-items-center text-[10px] text-slate-400">No image</span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-bold leading-5 text-slate-950 hover:text-teal-700">{product.title}</Link>
          <p className="mt-1 text-xs text-slate-500">{product.brand ?? product.category.name}</p>
          <p className="mt-1 text-base font-extrabold text-slate-950">{priceFormatter.format(product.price)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-600">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          {product.rating.toFixed(1)}
        </span>
        <span className={isOutOfStock ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>
          <span className="mr-1 inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
          {isOutOfStock ? "Out of stock" : "In stock"}
        </span>
        <span className="text-slate-500">{product.category.name}</span>
      </div>
      <Link href={`/products/${product.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-600">
        View product <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </article>
  );
}
