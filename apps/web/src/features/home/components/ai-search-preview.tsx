import type { ProductSummaryContract } from "@shopmind/contracts";
import {
  ArrowRight,
  BatteryCharging,
  Check,
  CircleDollarSign,
  CodeXml,
  Laptop,
  Minus,
  PackageCheck,
  Sparkles,
  Weight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import type { HomeCatalogData } from "@/features/home/types";
import { CompactDataState } from "./compact-data-state";

const intentChips = [
  { label: "Laptops", icon: Laptop },
  { label: "Under $1200", icon: CircleDollarSign },
  { label: "16GB RAM", icon: PackageCheck },
  { label: "Docker", icon: CodeXml },
  { label: "Portable", icon: Weight },
  { label: "Long Battery Life", icon: BatteryCharging },
] as const;

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function AiSearchPreview({
  state,
}: {
  readonly state: HomeCatalogData["products"];
}) {
  const products = state.status === "success" ? state.previewItems : [];
  return (
    <section aria-labelledby="ai-preview-title" className="home-section pb-5">
      <div className="grid overflow-hidden rounded-[26px] border border-blue-100 bg-blue-50/35 shadow-[0_12px_35px_rgba(30,64,175,0.05)] lg:grid-cols-[0.78fr_1.42fr]">
        <Reveal direction="left" className="p-7 sm:p-10 lg:p-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-teal-700">
            How AI search works
          </p>
          <h2 id="ai-preview-title" className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl">
            Describe what you need.
            <span className="block">Get grounded recommendations.</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            Our AI understands your intent, considers key factors, and shows
            you products with reasons, trade-offs, and source-backed facts.
          </p>
          <div aria-label="Example interpreted intent" className="mt-8 flex flex-wrap gap-3">
            {intentChips.map(({ label, icon: Icon }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/50">
                <Icon className="size-4 text-slate-600" aria-hidden="true" /> {label}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal direction="right" delay={120} className="border-t border-blue-100 bg-white/65 p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-8">
          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-950 sm:text-base">
                Your search: “Laptop for backend development under $1200”
              </h3>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                Interpreted intent
              </span>
            </div>
            {state.status === "error" ? (
              <div className="p-5">
                <CompactDataState kind="error" message="Live recommendations are temporarily unavailable." requestId={state.requestId} />
              </div>
            ) : state.status === "empty" || products.length === 0 ? (
              <div className="p-5">
                <CompactDataState kind="empty" message="No canonical products are available for this preview." />
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {products.map((product, index) => (
                  <RecommendationRow key={product.id} product={product} delay={index * 70} />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:text-sm">
              <span>Canonical facts remain backend-owned</span>
              <Link href="/search/ai" className="group inline-flex items-center gap-2 font-bold text-indigo-600">
                View all results
                <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function RecommendationRow({
  product,
  delay,
}: {
  readonly product: ProductSummaryContract;
  readonly delay: number;
}) {
  return (
    <Reveal delay={delay} className="grid gap-4 p-5 sm:grid-cols-[76px_1fr_auto] lg:grid-cols-[76px_1fr_135px]">
      <div className="relative size-[76px] overflow-hidden rounded-xl bg-slate-50">
        {product.thumbnail ? (
          <Image src={product.thumbnail} alt={product.title} fill sizes="76px" className="object-contain p-2" />
        ) : null}
      </div>
      <div className="min-w-0">
        <h4 className="font-bold text-slate-950">{product.title}</h4>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {product.brand ?? product.category.name} · rating {product.rating.toFixed(1)}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
          <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {product.stock > 0 ? `${product.stock} units available` : "Currently out of stock"}
        </p>
      </div>
      <div className="sm:text-right lg:text-left">
        <p className="font-extrabold text-slate-950">{priceFormatter.format(product.price)}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 lg:items-start">
          <Sparkles className="size-3.5 shrink-0" aria-hidden="true" /> Canonical match
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 lg:items-start">
          <Minus className="size-3.5 shrink-0 text-amber-500" aria-hidden="true" /> Review full specs
        </p>
      </div>
    </Reveal>
  );
}
