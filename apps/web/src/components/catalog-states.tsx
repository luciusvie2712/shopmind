import Link from "next/link";
import { AlertTriangle, PackageSearch, RefreshCw } from "lucide-react";

export function ApiUnavailableState({ requestId }: { requestId?: string }) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center"
    >
      <AlertTriangle
        className="mx-auto size-8 text-amber-700"
        aria-hidden="true"
      />
      <h2 className="mt-4 text-lg font-semibold text-amber-950">
        We couldn&apos;t load products right now
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-amber-800">
        ShopMind could not reach the product service. Your filters are still in
        the URL, so you can retry without losing your place.
      </p>
      {requestId ? (
        <p className="mt-2 font-mono text-xs text-amber-700">
          Request ID: {requestId}
        </p>
      ) : null}
      <a
        href=""
        className="btn-danger mt-5 bg-amber-900 hover:bg-amber-800"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </a>
    </section>
  );
}

export function EmptyCatalogState({
  filtered = false,
}: {
  filtered?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <PackageSearch
        className="mx-auto size-9 text-slate-400"
        aria-hidden="true"
      />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {filtered ? "No products match these filters" : "The catalog is empty"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {filtered
          ? "Try a broader keyword, category, or price range."
          : "Products will appear here after the catalog has been imported."}
      </p>
      {filtered ? (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/products" className="btn-secondary">
            Clear all filters
          </Link>
          <Link href="/search/ai" className="btn-ai">
            Try AI Search
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function ValidationState({ errors }: { errors: readonly string[] }) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-6"
    >
      <h2 className="font-semibold text-red-950">Check your catalog filters</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </section>
  );
}
