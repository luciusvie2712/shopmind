import type { ProductDetailContract, ProductSummaryContract } from "@shopmind/contracts";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import type { HomeCatalogData } from "@/features/home/types";
import { CompactDataState } from "./compact-data-state";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ComparePreview({
  state,
}: {
  readonly state: HomeCatalogData["products"];
}) {
  const products = state.status === "success" ? state.compareItems : [];
  const details = state.status === "success" ? state.details : [];
  const compareHref = products.length >= 2
    ? `/compare?ids=${products.map(({ id }) => id).join(",")}`
    : "/compare";

  return (
    <section aria-labelledby="compare-preview-title" className="home-section py-5 lg:py-8">
      <Reveal>
        <div className="grid gap-7 rounded-[26px] border border-blue-100 bg-white p-6 shadow-[0_12px_35px_rgba(30,64,175,0.05)] sm:p-8 lg:grid-cols-[0.65fr_1.65fr_0.65fr] lg:p-10">
          <div className="lg:py-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-teal-700">
              Compare up to 3 products
            </p>
            <h2 id="compare-preview-title" className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-950">
              Compare side by side.
              <span className="block">Choose with clarity.</span>
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              See key specs, strengths, and trade-offs in a clean, easy-to-scan comparison.
            </p>
            <Link href={compareHref} className="group mt-8 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">
              Compare products
              <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>
          <div>
            {state.status === "error" ? (
              <CompactDataState kind="error" message="Live comparison data is temporarily unavailable." requestId={state.requestId} />
            ) : state.status === "empty" || products.length < 2 ? (
              <CompactDataState kind="empty" message="At least two canonical products are needed for this preview." />
            ) : (
              <ComparisonTable products={products} details={details} />
            )}
          </div>
          <Reveal delay={120} className="rounded-2xl border border-teal-100 bg-teal-50/70 p-5 lg:p-6">
            <h3 className="flex items-center gap-2 font-extrabold text-slate-950">
              Summary <Sparkles className="size-4 text-indigo-600" aria-hidden="true" />
            </h3>
            {products.length > 0 ? (
              <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
                <p>
                  <strong className="text-slate-950">{products[0]?.title}</strong>{" "}
                  leads this preview by canonical rating.
                </p>
                <p>Use the full comparison for verified facts and a grounded AI summary.</p>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-600">
                A grounded summary appears when canonical products are available.
              </p>
            )}
            <Link href={compareHref} className="group mt-8 inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm">
              View full comparison
              <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}

function ComparisonTable({
  products,
  details,
}: {
  readonly products: readonly ProductSummaryContract[];
  readonly details: readonly ProductDetailContract[];
}) {
  const detailMap = new Map(details.map((detail) => [detail.id, detail]));
  const rows = [
    {
      label: "Rating",
      values: products.map((product) => (
        <span key={product.id} className="inline-flex items-center gap-1">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          {product.rating.toFixed(1)}
        </span>
      )),
    },
    { label: "Processor", values: products.map((p) => metadataValue(detailMap.get(p.id), ["processor", "cpu"])) },
    { label: "RAM", values: products.map((p) => metadataValue(detailMap.get(p.id), ["ram", "memory"])) },
    { label: "Storage", values: products.map((p) => metadataValue(detailMap.get(p.id), ["storage", "disk"])) },
    { label: "Weight", values: products.map((p) => metadataValue(detailMap.get(p.id), ["weight"])) },
    { label: "Best for", values: products.map((p) => p.category.name) },
  ];

  return (
    <div role="region" aria-label="Featured product comparison" tabIndex={0} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[700px] w-full border-collapse text-sm">
        <caption className="sr-only">Canonical comparison preview</caption>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-28 border-b border-r border-slate-200 bg-slate-50 p-3 text-left text-slate-500">Product</th>
            {products.map((product) => (
              <th key={product.id} className="min-w-44 border-b border-r border-slate-200 p-3 text-left last:border-r-0">
                <div className="flex items-center gap-2">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    {product.thumbnail ? (
                      <Image src={product.thumbnail} alt="" fill sizes="48px" className="object-contain p-1" />
                    ) : null}
                  </span>
                  <span>
                    <span className="line-clamp-2 font-bold text-slate-950">{product.title}</span>
                    <span className="mt-1 block text-slate-700">{priceFormatter.format(product.price)}</span>
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-3 text-left font-bold text-slate-700">{row.label}</th>
              {row.values.map((value, index) => (
                <td key={`${row.label}-${products[index]?.id}`} className="border-b border-r border-slate-200 p-3 text-slate-600 last:border-r-0">{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function metadataValue(
  detail: ProductDetailContract | undefined,
  keys: readonly string[],
): string {
  if (!detail) return "—";
  const entry = Object.entries(detail.metadata).find(([key]) =>
    keys.includes(key.toLowerCase()),
  );
  const value = entry?.[1];
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "—";
}
