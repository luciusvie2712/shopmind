import type { ReactNode } from "react";
import {
  ApiUnavailableState,
  EmptyCatalogState,
  ValidationState,
} from "@/components/catalog-states";
import { CatalogFilters } from "@/features/products/catalog-filters";
import { CatalogPagination } from "@/features/products/catalog-pagination";
import {
  parseCatalogSearchParams,
  toProductListQuery,
  toProductSearchQuery,
  type CatalogSearchParams,
} from "@/features/products/catalog-query";
import { CompareSelection } from "@/features/compare/compare-selection";
import { SemanticSearch } from "@/features/products/semantic-search";
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
  searchParams: Promise<CatalogSearchParams>;
}) {
  const parsed = parseCatalogSearchParams(await searchParams);
  const categoriesPromise = getCategories();
  if (parsed.errors.length > 0) {
    const categories = await categoriesPromise.catch(() => []);
    return (
      <CatalogPage state={parsed.state} categories={categories}>
        <ValidationState errors={parsed.errors} />
      </CatalogPage>
    );
  }
  const result = await loadCatalog(parsed.state, categoriesPromise);
  if (result.ok) {
    const { categories, products } = result;
    return (
      <CatalogPage state={parsed.state} categories={categories}>
        <div className="mb-5 text-sm text-slate-600">
          <strong className="text-slate-950">{products.total}</strong> products
        </div>
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
      </CatalogPage>
    );
  }

  return (
    <CatalogPage state={parsed.state} categories={result.categories}>
      {result.error instanceof ApiClientError &&
      result.error.code === "VALIDATION_ERROR" ? (
        <ValidationState errors={[result.error.message]} />
      ) : (
        <ApiUnavailableState
          requestId={
            result.error instanceof ApiClientError
              ? result.error.requestId
              : undefined
          }
        />
      )}
    </CatalogPage>
  );
}

async function loadCatalog(
  state: ReturnType<typeof parseCatalogSearchParams>["state"],
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
  children,
}: {
  state: ReturnType<typeof parseCatalogSearchParams>["state"];
  categories: Awaited<ReturnType<typeof getCategories>>;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-slate-500">ShopMind catalog</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
        Products
      </h1>
      <div className="mt-8">
        <CatalogFilters categories={categories} state={state} />
      </div>
      <div className="mt-6">
        <SemanticSearch
          category={state.category}
          minPrice={state.minPrice}
          maxPrice={state.maxPrice}
        />
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );
}
