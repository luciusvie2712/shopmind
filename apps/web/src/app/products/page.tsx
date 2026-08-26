import type { ProductListContract } from "@shopmind/contracts";
import { ChevronRight, Home, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ApiUnavailableState,
  EmptyCatalogState,
  ValidationState,
} from "@/components/catalog-states";
import { AiSearchPreview } from "@/features/home/components/ai-search-preview";
import { ComparePreview } from "@/features/home/components/compare-preview";
import { TrustSection } from "@/features/home/components/trust-section";
import type { HomeCatalogData } from "@/features/home/types";
import { ActiveFilterChips } from "@/features/products/active-filter-chips";
import { CatalogFilters } from "@/features/products/catalog-filters";
import { CatalogPagination } from "@/features/products/catalog-pagination";
import {
  parseCatalogSearchParams,
  toProductListQuery,
  toProductSearchQuery,
  type CatalogSearchParams,
  type CatalogUrlState,
} from "@/features/products/catalog-query";
import { CatalogToolbar } from "@/features/products/catalog-toolbar";
import { SemanticSearch } from "@/features/products/semantic-search";
import { CompareSelection } from "@/features/compare/compare-selection";
import {
  ApiClientError,
  getCategories,
  getProducts,
  searchProducts,
} from "@/lib/api/client";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  readonly searchParams: Promise<CatalogSearchParams>;
}) {
  const parsed = parseCatalogSearchParams(await searchParams);
  const categoriesPromise = getCategories();

  if (parsed.errors.length > 0) {
    const categories = await categoriesPromise.catch(() => []);
    return (
      <CatalogPage
        state={parsed.state}
        categories={categories}
        promoState={{ status: "empty" }}
      >
        <ValidationState errors={parsed.errors} />
      </CatalogPage>
    );
  }

  const result = await loadCatalog(parsed.state, categoriesPromise);
  if (result.ok) {
    const { categories, products } = result;
    const promoState = promotionState(products);
    return (
      <CatalogPage
        state={parsed.state}
        categories={categories}
        promoState={promoState}
      >
        <ActiveFilterChips categories={categories} state={parsed.state} />
        <CatalogToolbar
          state={parsed.state}
          total={products.total}
          pageSize={products.pageSize}
          visibleCount={products.items.length}
        />

        <details className="group mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40">
          <summary className="flex min-h-11 list-none items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-800 [&::-webkit-details-marker]:hidden">
            <Sparkles className="size-4" aria-hidden="true" />
            Search this catalog by meaning
            <ChevronRight className="ml-auto size-4 transition group-open:rotate-90" aria-hidden="true" />
          </summary>
          <div className="border-t border-indigo-100 p-3">
            <SemanticSearch
              category={parsed.state.category}
              minPrice={parsed.state.minPrice}
              maxPrice={parsed.state.maxPrice}
            />
          </div>
        </details>

        <div className="mt-5">
          {products.items.length === 0 ? (
            <EmptyCatalogState filtered />
          ) : (
            <>
              <CompareSelection products={products.items} />
              <CatalogPagination
                state={parsed.state}
                totalPages={products.totalPages}
              />
            </>
          )}
        </div>
      </CatalogPage>
    );
  }

  const requestId =
    result.error instanceof ApiClientError ? result.error.requestId : undefined;
  return (
    <CatalogPage
      state={parsed.state}
      categories={result.categories}
      promoState={{ status: "error", requestId }}
    >
      {result.error instanceof ApiClientError &&
      result.error.code === "VALIDATION_ERROR" ? (
        <ValidationState errors={[result.error.message]} />
      ) : (
        <ApiUnavailableState requestId={requestId} />
      )}
    </CatalogPage>
  );
}

async function loadCatalog(
  state: CatalogUrlState,
  categoriesPromise: ReturnType<typeof getCategories>,
) {
  try {
    const [categories, products] = await Promise.all([
      categoriesPromise,
      state.q === undefined
        ? getProducts(toProductListQuery(state))
        : searchProducts(toProductSearchQuery({ ...state, q: state.q })),
    ]);
    return { ok: true as const, categories, products };
  } catch (error) {
    return {
      ok: false as const,
      categories: await categoriesPromise.catch(() => []),
      error,
    };
  }
}

function CatalogPage({
  state,
  categories,
  promoState,
  children,
}: {
  readonly state: CatalogUrlState;
  readonly categories: Awaited<ReturnType<typeof getCategories>>;
  readonly promoState: HomeCatalogData["products"];
  readonly children: ReactNode;
}) {
  return (
    <main className="overflow-x-clip bg-white/75">
      <div className="page-shell pt-6 sm:pt-7 lg:pt-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-teal-700">
            <Home className="size-3.5" aria-hidden="true" /> Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span aria-current="page" className="text-slate-700">Products</span>
        </nav>

        <header className="mt-5">
          <p className="page-kicker">ShopMind catalog</p>
          <h1 className="page-title">All Products</h1>
          <p className="page-description mt-2">
            Discover our curated collection of trusted products.
          </p>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)] xl:gap-8">
          <CatalogFilters categories={categories} state={state} />
          <section aria-label="Product results" className="min-w-0">
            {children}
          </section>
        </div>
      </div>

      <AiSearchPreview state={promoState} />
      <ComparePreview state={promoState} />
      <TrustSection />
    </main>
  );
}

function promotionState(
  products: ProductListContract,
): HomeCatalogData["products"] {
  if (products.items.length === 0) return { status: "empty" };
  const previewItems = products.items.slice(0, 3);
  return {
    status: "success",
    items: products.items,
    previewItems,
    compareItems: previewItems,
    details: [],
    reviewCounts: {},
  };
}
