import type {
  ProductDetailContract,
  ProductReviewContract,
} from "@shopmind/contracts";
import { CheckCircle2, Star } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ReviewSummary } from "./review-summary";

type MetadataRow = readonly [label: string, value: string];

export function ProductDetailContent({
  product,
}: {
  readonly product: ProductDetailContract;
}) {
  const specifications = normalizedMetadataRows(product.metadata);
  const hasReviews = product.reviews.length > 0;

  return (
    <Reveal>
      <section className="surface-panel overflow-hidden" aria-labelledby="product-details-title">
        <div className="flex gap-6 overflow-x-auto border-b border-slate-200 px-5 sm:px-7">
          <a href="#overview" className="border-b-2 border-teal-600 py-4 text-sm font-extrabold text-teal-700">
            Overview
          </a>
          {specifications.length > 0 ? (
            <a href="#specifications" className="border-b-2 border-transparent py-4 text-sm font-bold text-slate-700 hover:text-teal-700">
              Specifications
            </a>
          ) : null}
          {hasReviews ? (
            <a href="#reviews" className="border-b-2 border-transparent py-4 text-sm font-bold text-slate-700 hover:text-teal-700">
              Reviews ({product.reviews.length})
            </a>
          ) : null}
        </div>

        <div className={`grid gap-8 p-5 sm:p-7 ${specifications.length > 0 ? "lg:grid-cols-2" : ""}`}>
          <section id="overview" className="scroll-mt-28">
            <h2 id="product-details-title" className="text-lg font-extrabold text-slate-950">Overview</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{product.description}</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <Fact label="Category" value={product.category.name} />
              {product.brand ? <Fact label="Brand" value={product.brand} /> : null}
              <Fact label="Rating" value={`${product.rating.toFixed(1)} / 5`} />
              <Fact label="Availability" value={product.stock > 0 ? "In stock" : "Out of stock"} />
            </dl>
          </section>

          {specifications.length > 0 ? (
            <section id="specifications" className="scroll-mt-28 lg:border-l lg:border-slate-200 lg:pl-8">
              <h2 className="text-lg font-extrabold text-slate-950">Specifications</h2>
              <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                {specifications.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(100px,0.7fr)_minmax(0,1fr)] gap-4 py-3 text-sm">
                    <dt className="font-semibold text-slate-700">{label}</dt>
                    <dd className="min-w-0 break-words text-slate-600">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        {hasReviews ? (
          <section id="reviews" className="scroll-mt-28 border-t border-slate-200 p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-extrabold text-slate-950">Customer reviews</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {product.rating.toFixed(1)} · {product.reviews.length}
              </span>
            </div>
            <ReviewSummary productId={product.id} />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {product.reviews.map((review, index) => (
                <ReviewCard key={`${review.reviewerName}-${review.reviewedAt}-${index}`} review={review} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </Reveal>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
      <div>
        <dt className="text-xs font-semibold text-slate-500">{label}</dt>
        <dd className="mt-0.5 font-bold text-slate-800">{value}</dd>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { readonly review: ProductReviewContract }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-bold text-slate-900">{review.reviewerName}</h3>
        <time dateTime={review.reviewedAt} className="text-xs text-slate-500">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(review.reviewedAt))}
        </time>
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-amber-700">
        <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
        {review.rating.toFixed(1)} / 5
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment}</p>
    </article>
  );
}

function normalizedMetadataRows(metadata: Readonly<Record<string, unknown>>): readonly MetadataRow[] {
  return Object.entries(metadata)
    .flatMap(([key, value]): MetadataRow[] => {
      const formatted = formatMetadataValue(value);
      return formatted === undefined ? [] : [[humanizeKey(key), formatted]];
    })
    .slice(0, 12);
}

function formatMetadataValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const values = value.filter((item): item is string | number => typeof item === "string" || (typeof item === "number" && Number.isFinite(item)));
    return values.length > 0 ? values.join(", ") : undefined;
  }
  if (isPrimitiveRecord(value)) {
    const values = Object.entries(value).map(([key, item]) => `${humanizeKey(key)} ${String(item)}`);
    return values.length > 0 ? values.join(" · ") : undefined;
  }
  return undefined;
}

function isPrimitiveRecord(value: unknown): value is Readonly<Record<string, string | number | boolean>> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((item) => ["string", "number", "boolean"].includes(typeof item));
}

function humanizeKey(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
