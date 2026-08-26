import type { CategoryContract } from "@shopmind/contracts";
import { X } from "lucide-react";
import Link from "next/link";
import {
  catalogHref,
  type CatalogUrlState,
} from "./catalog-query";

export function ActiveFilterChips({
  categories,
  state,
}: {
  readonly categories: readonly CategoryContract[];
  readonly state: CatalogUrlState;
}) {
  const categoryName = categories.find(
    (category) => category.slug === state.category,
  )?.name;
  const chips = [
    state.q
      ? {
          key: "q" as const,
          label: `Search: ${state.q}`,
          href: catalogHref({ ...state, q: undefined }, 1),
        }
      : undefined,
    state.category
      ? {
          key: "category" as const,
          label: `Category: ${categoryName ?? state.category}`,
          href: catalogHref({ ...state, category: undefined }, 1),
        }
      : undefined,
    state.minPrice !== undefined || state.maxPrice !== undefined
      ? {
          key: "price" as const,
          label: `Price: ${formatBound(state.minPrice, "$0")} – ${formatBound(state.maxPrice, "Any")}`,
          href: catalogHref(
            { ...state, minPrice: undefined, maxPrice: undefined },
            1,
          ),
        }
      : undefined,
  ].filter((chip) => chip !== undefined);

  if (chips.length === 0) return null;

  return (
    <div
      aria-label="Active catalog filters"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
    >
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={`Remove ${chip.label} filter`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
        >
          {chip.label}
          <X className="size-3.5" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

function formatBound(value: number | undefined, fallback: string): string {
  return value === undefined
    ? fallback
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
}
