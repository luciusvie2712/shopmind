import type { AiSearchResultContract } from "@shopmind/contracts";
import { ArrowRight, Check, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductActions } from "@/features/products/product-actions";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function AiRecommendationCard({
  result,
  rank,
  selected,
  compareDisabled,
  onCompareToggle,
}: {
  readonly result: AiSearchResultContract;
  readonly rank: number;
  readonly selected: boolean;
  readonly compareDisabled: boolean;
  readonly onCompareToggle: () => void;
}) {
  const { product } = result;
  const isOutOfStock = product.stock <= 0;
  const hasExplanation = result.reason !== undefined || result.tradeoffs.length > 0;
  const identity = product.brand
    ? `${product.brand} · ${product.category.name}`
    : product.category.name;

  return (
    <article className={`group relative grid min-w-0 gap-5 rounded-[18px] border border-slate-200 bg-white p-4 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card-hover motion-reduce:transform-none sm:grid-cols-[28px_128px_minmax(0,1fr)] lg:items-center lg:p-5 ${hasExplanation ? "lg:grid-cols-[28px_142px_minmax(180px,1fr)_minmax(190px,0.85fr)_104px]" : "lg:grid-cols-[28px_142px_minmax(0,1fr)_104px]"}`}>
      <span className="grid size-7 place-items-center self-start rounded-full bg-teal-600 text-xs font-extrabold text-white lg:self-center">
        {rank}
      </span>

      <Link
        href={`/products/${product.id}`}
        className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-white sm:aspect-[1.08/1]"
      >
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 142px, 128px"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
          />
        ) : (
          <span className="grid h-full place-items-center p-3 text-center text-xs text-slate-400">
            No image available
          </span>
        )}
      </Link>

      <div className="min-w-0 sm:col-start-3 lg:col-start-auto">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${product.id}`} className="group/link inline-flex items-center gap-1.5">
              <h3 className="line-clamp-2 font-extrabold text-slate-950 group-hover/link:text-indigo-700">
                {product.title}
              </h3>
              <ArrowRight className="size-3.5 shrink-0 text-slate-400 transition group-hover/link:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
            <p className="mt-1 text-xs text-slate-500">{identity}</p>
          </div>
          <p className="text-lg font-extrabold tracking-tight text-slate-950">
            {priceFormatter.format(product.price)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            {product.rating.toFixed(1)}
          </span>
          <span className={`font-semibold ${isOutOfStock ? "text-red-700" : "text-emerald-700"}`}>
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />
            {isOutOfStock ? "Out of stock" : "In stock"}
          </span>
        </div>
      </div>

      {hasExplanation ? (
      <div className="border-t border-slate-200 pt-4 sm:col-span-2 sm:col-start-2 lg:col-span-1 lg:col-start-auto lg:border-l lg:border-t-0 lg:py-1 lg:pl-5">
        {result.reason ? (
          <section>
            <h4 className="text-xs font-extrabold text-slate-900">Why it fits</h4>
            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              {result.reason}
            </p>
          </section>
        ) : null}
        {result.tradeoffs.length > 0 ? (
          <section className={result.reason ? "mt-3" : ""}>
            <h4 className="text-xs font-extrabold text-amber-700">Trade-offs</h4>
            <ul className="mt-1.5 space-y-1.5 text-xs leading-5 text-slate-600">
              {result.tradeoffs.map((tradeoff, index) => (
                <li key={`${tradeoff}-${index}`} className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                  {tradeoff}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      ) : null}

      <div className="flex items-center gap-2 sm:col-span-2 sm:col-start-2 lg:col-span-1 lg:col-start-auto lg:flex-col lg:border-l lg:border-slate-200 lg:pl-3">
        <label className="grid size-10 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
          <input
            type="checkbox"
            checked={selected}
            disabled={compareDisabled}
            onChange={onCompareToggle}
            className="size-4 accent-indigo-600"
          />
          <span className="sr-only">Compare {product.title}</span>
        </label>
        <ProductActions product={product} compact iconOnly />
      </div>
    </article>
  );
}
