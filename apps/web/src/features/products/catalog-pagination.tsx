import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { catalogHref, type CatalogUrlState } from "./catalog-query";

export function CatalogPagination({
  state,
  totalPages,
}: {
  readonly state: CatalogUrlState;
  readonly totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const pages = paginationItems(state.page, totalPages);

  return (
    <nav
      aria-label="Catalog pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      <PaginationArrow
        direction="previous"
        href={state.page > 1 ? pageHref(state, state.page - 1) : undefined}
      />
      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="grid size-10 place-items-center text-sm text-slate-400"
            aria-hidden="true"
          >
            …
          </span>
        ) : page === state.page ? (
          <span
            key={page}
            aria-current="page"
            className="grid size-10 place-items-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-sm"
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={pageHref(state, page)}
            aria-label={`Page ${page}`}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
          >
            {page}
          </Link>
        ),
      )}
      <PaginationArrow
        direction="next"
        href={
          state.page < totalPages ? pageHref(state, state.page + 1) : undefined
        }
      />
      <p className="ml-2 text-xs font-medium text-slate-500">
        Page {state.page} of {totalPages}
      </p>
    </nav>
  );
}

function PaginationArrow({
  direction,
  href,
}: {
  readonly direction: "previous" | "next";
  readonly href?: string;
}) {
  const label = direction === "previous" ? "Previous" : "Next";
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const className =
    "grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-teal-200 hover:text-teal-700";

  return href ? (
    <Link href={href} aria-label={label} className={className}>
      <Icon className="size-4" aria-hidden="true" />
    </Link>
  ) : (
    <span
      aria-disabled="true"
      className={`${className} cursor-not-allowed opacity-40`}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function pageHref(state: CatalogUrlState, page: number): string {
  return `${catalogHref(state, page)}#catalog-results`;
}

function paginationItems(
  currentPage: number,
  totalPages: number,
): readonly (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visible = new Set([1, 2, totalPages - 1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 0 && page <= totalPages) visible.add(page);
  }
  const sorted = [...visible].sort((left, right) => left - right);
  const items: (number | "ellipsis")[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}
