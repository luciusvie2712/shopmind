import type {
  AiCompareContract,
  ComparisonAttributeValue,
  ComparisonProductContract,
} from "@shopmind/contracts";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const reservedAttributeNames = new Set([
  "availability",
  "brand",
  "category",
  "price",
  "rating",
  "stock",
  "thumbnail",
  "title",
]);

export function CompareWorkspace({
  comparison,
  isRefreshing,
  onRemoveProduct,
  onRetrySummary,
}: {
  readonly comparison: AiCompareContract;
  readonly isRefreshing: boolean;
  readonly onRemoveProduct: (productId: string) => void;
  readonly onRetrySummary: () => void;
}) {
  const attributeKeys = comparisonAttributeKeys(comparison.products);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[17.5rem_minmax(0,1fr)]">
      <SelectedProductsPanel
        products={comparison.products}
        onRemoveProduct={onRemoveProduct}
      />

      <div className="min-w-0 space-y-6">
        <ComparisonTable
          products={comparison.products}
          attributeKeys={attributeKeys}
          onRemoveProduct={onRemoveProduct}
        />
        <ComparisonSummary
          comparison={comparison}
          isRefreshing={isRefreshing}
          onRetry={onRetrySummary}
        />
      </div>
    </div>
  );
}

function SelectedProductsPanel({
  products,
  onRemoveProduct,
}: {
  readonly products: readonly ComparisonProductContract[];
  readonly onRemoveProduct: (productId: string) => void;
}) {
  return (
    <aside
      aria-labelledby="selected-products-title"
      className="surface-card overflow-hidden"
    >
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 id="selected-products-title" className="font-bold text-slate-950">
          Compare products
        </h2>
        <p className="mt-1 text-xs font-semibold text-teal-700">
          {products.length} / 4 products selected
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {products.map((product) => (
          <li key={product.id} className="flex items-center gap-3 px-4 py-3">
            <ProductThumbnail product={product} size="small" />
            <Link
              href={`/products/${product.id}`}
              className="min-w-0 flex-1 text-sm font-semibold text-slate-800 transition-colors hover:text-teal-700"
            >
              <span className="line-clamp-2">{product.title}</span>
            </Link>
            <RemoveProductButton
              title={product.title}
              onClick={() => onRemoveProduct(product.id)}
            />
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-200 p-4">
        <Link href="/products" className="btn-secondary w-full">
          Change products
        </Link>
      </div>
    </aside>
  );
}

function ComparisonTable({
  products,
  attributeKeys,
  onRemoveProduct,
}: {
  readonly products: readonly ComparisonProductContract[];
  readonly attributeKeys: readonly string[];
  readonly onRemoveProduct: (productId: string) => void;
}) {
  return (
    <section aria-labelledby="comparison-table-title" className="min-w-0">
      <h2 id="comparison-table-title" className="sr-only">
        Canonical product comparison
      </h2>
      <div
        role="region"
        aria-label="Product comparison table"
        tabIndex={0}
        className="surface-card overflow-x-auto focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Canonical facts for {products.length} selected ShopMind products
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 w-40 min-w-40 border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left align-top font-bold text-slate-900"
              >
                Product
              </th>
              {products.map((product) => (
                <th
                  key={product.id}
                  scope="col"
                  className="w-64 min-w-64 border-b border-r border-slate-200 bg-white p-5 text-left align-top last:border-r-0"
                >
                  <ProductHeader
                    product={product}
                    onRemove={() => onRemoveProduct(product.id)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ComparisonRow
              label="Brand"
              values={products.map((product) => product.brand ?? "—")}
            />
            <ComparisonRow
              label="Category"
              values={products.map((product) => product.category.name)}
            />
            <ComparisonRow
              label="Price"
              values={products.map((product) =>
                priceFormatter.format(product.price),
              )}
              emphasized
            />
            <ComparisonRow
              label="Rating"
              values={products.map((product) => product.rating.toFixed(1))}
              renderValue={(value) => (
                <span className="inline-flex items-center gap-1.5">
                  <Star
                    className="size-4 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                  {value}
                </span>
              )}
            />
            <ComparisonRow
              label="Availability"
              values={products.map((product) =>
                product.stock > 0
                  ? `${product.stock} in stock`
                  : "Out of stock",
              )}
              renderValue={(value) => (
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    value === "Out of stock"
                      ? "text-red-700"
                      : "text-emerald-700"
                  }`}
                >
                  <span
                    className="size-1.5 rounded-full bg-current"
                    aria-hidden="true"
                  />
                  {value}
                </span>
              )}
            />
            {attributeKeys.map((key) => (
              <ComparisonRow
                key={key}
                label={humanizeKey(key)}
                values={products.map((product) =>
                  formatAttributeValue(product.attributes[key]),
                )}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500 sm:hidden">
        Swipe horizontally to compare every product.
      </p>
    </section>
  );
}

function ProductHeader({
  product,
  onRemove,
}: {
  readonly product: ComparisonProductContract;
  readonly onRemove: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="absolute right-0 top-0">
        <RemoveProductButton title={product.title} onClick={onRemove} />
      </div>
      <Link href={`/products/${product.id}`} className="group pr-9">
        <ProductThumbnail product={product} size="large" />
        <h3 className="mt-4 line-clamp-2 min-h-12 text-base font-extrabold leading-6 text-slate-950 transition-colors group-hover:text-teal-700">
          {product.title}
        </h3>
      </Link>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {product.brand ?? product.category.name}
      </p>
      <p className="mt-3 text-xl font-extrabold tracking-tight text-slate-950">
        {priceFormatter.format(product.price)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1 text-slate-600">
          <Star
            className="size-4 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
          {product.rating.toFixed(1)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 font-semibold ${
            product.stock > 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {product.stock > 0 ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-4" aria-hidden="true" />
          )}
          {product.stock > 0 ? "In stock" : "Out of stock"}
        </span>
      </div>
    </div>
  );
}

function ProductThumbnail({
  product,
  size,
}: {
  readonly product: ComparisonProductContract;
  readonly size: "small" | "large";
}) {
  const large = size === "large";
  const className = large
    ? "relative grid h-28 w-full place-items-center overflow-hidden rounded-xl bg-slate-50"
    : "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50";

  return (
    <div className={className}>
      {product.thumbnail ? (
        large ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="256px"
            className="object-contain p-2"
          />
        ) : (
          <Image
            src={product.thumbnail}
            alt=""
            width={48}
            height={48}
            className="size-12 object-contain p-1"
          />
        )
      ) : (
        <ImageIcon className="size-6 text-slate-300" aria-hidden="true" />
      )}
    </div>
  );
}

function RemoveProductButton({
  title,
  onClick,
}: {
  readonly title: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Remove ${title} from comparison`}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700 active:scale-95 motion-reduce:transform-none"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

function ComparisonRow({
  label,
  values,
  emphasized = false,
  renderValue,
}: {
  readonly label: string;
  readonly values: readonly string[];
  readonly emphasized?: boolean;
  readonly renderValue?: (value: string) => ReactNode;
}) {
  return (
    <tr>
      <th
        scope="row"
        className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-5 py-3 text-left font-bold text-slate-800"
      >
        {label}
      </th>
      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          className={`border-b border-r border-slate-200 px-5 py-3 text-slate-700 last:border-r-0 ${
            emphasized ? "font-extrabold text-slate-950" : ""
          }`}
        >
          {renderValue ? renderValue(value) : value}
        </td>
      ))}
    </tr>
  );
}

function ComparisonSummary({
  comparison,
  isRefreshing,
  onRetry,
}: {
  readonly comparison: AiCompareContract;
  readonly isRefreshing: boolean;
  readonly onRetry: () => void;
}) {
  const hasSummary = comparison.status === "success" && comparison.summary;

  return (
    <section
      aria-labelledby="comparison-summary-title"
      aria-live="polite"
      className={`hero-enter rounded-card border p-6 shadow-card sm:p-7 ${
        hasSummary
          ? "border-indigo-200 bg-indigo-50/70"
          : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            hasSummary
              ? "bg-indigo-100 text-indigo-700"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {hasSummary ? (
            <Sparkles className="size-5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="comparison-summary-title"
            className={`font-bold ${
              hasSummary ? "text-indigo-950" : "text-amber-950"
            }`}
          >
            {hasSummary
              ? "Grounded AI summary"
              : "AI summary temporarily unavailable"}
          </h2>
          {hasSummary ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {comparison.summary}
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {comparison.fallbackReason === "AI_INVALID_OUTPUT"
                  ? "The AI response could not be verified. Canonical product facts remain available."
                  : "The AI provider did not respond in time. Canonical product facts remain available."}
              </p>
              <button
                type="button"
                onClick={onRetry}
                disabled={isRefreshing}
                className="btn-secondary mt-4 border-amber-200 text-amber-950 hover:border-amber-300 hover:text-amber-900"
              >
                {isRefreshing ? (
                  <LoaderCircle
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <RefreshCw className="size-4" aria-hidden="true" />
                )}
                {isRefreshing ? "Retrying summary..." : "Retry summary"}
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-5 text-xs text-slate-500">
        Request ID: {comparison.requestId}
      </p>
    </section>
  );
}

function comparisonAttributeKeys(
  products: readonly ComparisonProductContract[],
): readonly string[] {
  const keys = new Set<string>();
  for (const product of products) {
    for (const key of Object.keys(product.attributes)) {
      if (!reservedAttributeNames.has(key.toLowerCase())) keys.add(key);
    }
  }
  return [...keys];
}

function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words.length > 0
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : key;
}

function formatAttributeValue(
  value: ComparisonAttributeValue | undefined,
): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
