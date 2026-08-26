"use client";

import type { CategoryContract } from "@shopmind/contracts";
import {
  ChevronRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  catalogHref,
  catalogSearchParams,
  type CatalogUrlState,
  parseCatalogSearchParams,
} from "./catalog-query";

interface CatalogFiltersProps {
  readonly categories: readonly CategoryContract[];
  readonly state: CatalogUrlState;
}

const pricePresets = [
  { label: "$0 – $500", minPrice: 0, maxPrice: 500 },
  { label: "$500 – $1000", minPrice: 500, maxPrice: 1000 },
  { label: "$1000 – $1500", minPrice: 1000, maxPrice: 1500 },
  { label: "$1500+", minPrice: 1500, maxPrice: undefined },
] as const;

export function CatalogFilters({ categories, state }: CatalogFiltersProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeDialog(): void {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="btn-secondary w-full lg:hidden"
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
      </button>

      <aside aria-label="Product filters" className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <FilterPanel categories={categories} state={state} />
          <AiFilterHelp />
        </div>
      </aside>

      <dialog
        ref={dialogRef}
        aria-labelledby="mobile-filter-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => triggerRef.current?.focus()}
        className="m-0 ml-auto h-dvh max-h-none w-[min(22rem,calc(100%-1rem))] max-w-none translate-x-0 overflow-y-auto border-0 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/40"
      >
        <div className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
            <h2 id="mobile-filter-title" className="font-extrabold">
              Product filters
            </h2>
            <button
              type="button"
              onClick={closeDialog}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              aria-label="Close filters"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 p-4">
            <FilterPanel
              categories={categories}
              state={state}
              mobile
              onApplied={closeDialog}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}

function FilterPanel({
  categories,
  state,
  mobile = false,
  onApplied,
}: CatalogFiltersProps & {
  readonly mobile?: boolean;
  readonly onApplied?: () => void;
}) {
  const router = useRouter();
  const [clientError, setClientError] = useState<string>();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (clientError) errorRef.current?.focus();
  }, [clientError]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const candidate = parseCatalogSearchParams({
      q: String(formData.get("q") ?? ""),
      category: String(formData.get("category") ?? ""),
      minPrice: String(formData.get("minPrice") ?? ""),
      maxPrice: String(formData.get("maxPrice") ?? ""),
      sort: state.sort,
      page: "1",
    });

    if (candidate.errors.length > 0) {
      setClientError(candidate.errors.join(" "));
      return;
    }

    setClientError(undefined);
    startTransition(() => {
      router.push(`/products?${catalogSearchParams(candidate.state, 1)}`);
      onApplied?.();
    });
  }

  return (
    <form
      key={`${mobile ? "mobile" : "desktop"}-${JSON.stringify(state)}`}
      onSubmit={submit}
      className="surface-card overflow-hidden"
      aria-label={mobile ? "Mobile catalog filters" : "Catalog filters"}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
          <SlidersHorizontal className="size-4 text-teal-700" aria-hidden="true" />
          Filters
        </h2>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              router.push("/products");
              onApplied?.();
            });
          }}
          className="text-xs font-bold text-teal-700 hover:text-teal-600"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-6 p-5">
        <FilterSection title="Search products">
          <label>
            <span className="sr-only">Keyword</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                name="q"
                type="search"
                defaultValue={state.q}
                maxLength={200}
                placeholder="Search products..."
                className="form-input mt-0 h-10 pl-9 pr-3"
              />
            </span>
          </label>
        </FilterSection>

        <FilterSection title="Categories">
          <div className="space-y-2.5">
            <CategoryOption
              label="All categories"
              value=""
              defaultChecked={state.category === undefined}
            />
            {categories.map((category) => (
              <CategoryOption
                key={category.id}
                label={category.name}
                value={category.slug}
                defaultChecked={state.category === category.slug}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Price range">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[11px] font-semibold text-slate-500">Minimum</span>
              <input
                name="minPrice"
                inputMode="decimal"
                defaultValue={state.minPrice}
                placeholder="$0"
                aria-label="Min price"
                className="form-input h-10"
              />
            </label>
            <label>
              <span className="text-[11px] font-semibold text-slate-500">Maximum</span>
              <input
                name="maxPrice"
                inputMode="decimal"
                defaultValue={state.maxPrice}
                placeholder="$2000"
                aria-label="Max price"
                className="form-input h-10"
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {pricePresets.map((preset) => {
              const selected =
                state.minPrice === preset.minPrice &&
                state.maxPrice === preset.maxPrice;
              return (
                <Link
                  key={preset.label}
                  href={catalogHref(
                    {
                      ...state,
                      minPrice: preset.minPrice,
                      maxPrice: preset.maxPrice,
                    },
                    1,
                  )}
                  onClick={onApplied}
                  aria-current={selected ? "true" : undefined}
                  className={`rounded-lg border px-2 py-2 text-center text-[11px] font-bold transition ${
                    selected
                      ? "border-teal-200 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-200 hover:bg-teal-50/60"
                  }`}
                >
                  {preset.label}
                </Link>
              );
            })}
          </div>
        </FilterSection>

        {clientError ? (
          <p
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700 outline-none"
          >
            {clientError}
          </p>
        ) : null}

        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? "Applying filters…" : "Apply filters"}
        </button>
      </div>
    </form>
  );
}

function FilterSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-700">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function CategoryOption({
  label,
  value,
  defaultChecked,
}: {
  readonly label: string;
  readonly value: string;
  readonly defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-7 cursor-pointer items-center gap-2.5 text-sm text-slate-600 hover:text-slate-950">
      <input
        type="radio"
        name="category"
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 appearance-none rounded-[4px] border border-slate-300 bg-white checked:border-teal-600 checked:bg-teal-600 checked:shadow-[inset_0_0_0_3px_white]"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </label>
  );
}

function AiFilterHelp() {
  return (
    <section className="overflow-hidden rounded-card border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-card">
      <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold leading-tight text-slate-950">
        Need help finding the right product?
      </h2>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Describe what you need and get grounded recommendations.
      </p>
      <Link href="/search/ai" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">
        Try AI Search <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
