import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { catalogHref, type CatalogUrlState } from "./catalog-query";

export function CatalogPagination({
  state,
  totalPages,
}: {
  state: CatalogUrlState;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Catalog pagination"
      className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6"
    >
      {state.page > 1 ? (
        <Link
          href={catalogHref(state, state.page - 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-slate-600">
        Page <strong className="text-slate-950">{state.page}</strong> of{" "}
        <strong className="text-slate-950">{totalPages}</strong>
      </p>
      {state.page < totalPages ? (
        <Link
          href={catalogHref(state, state.page + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
