import type {
  ProductListQuery,
  ProductSearchQuery,
  ProductSortValue,
} from "@shopmind/contracts";

export const CATALOG_PAGE_SIZE = 12;

export type CatalogSortValue =
  "rating" | "rating_asc" | "price_asc" | "price_desc";

export type CatalogSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

export interface CatalogUrlState {
  readonly q?: string;
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly sort: CatalogSortValue;
  readonly page: number;
}

export interface ParsedCatalogState {
  readonly state: CatalogUrlState;
  readonly errors: readonly string[];
}

const allowedSortValues = new Set<CatalogSortValue>([
  "rating",
  "rating_asc",
  "price_asc",
  "price_desc",
]);

function firstValue(value: string | readonly string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parsePrice(
  value: string,
  label: string,
  errors: string[],
): number | undefined {
  if (value === "") return undefined;
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) {
    errors.push(
      `${label} must be a non-negative number with up to 2 decimals.`,
    );
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    errors.push(`${label} is outside the supported range.`);
    return undefined;
  }
  return parsed;
}

export function parseCatalogSearchParams(
  searchParams: CatalogSearchParams,
): ParsedCatalogState {
  const errors: string[] = [];
  const rawQuery = firstValue(searchParams.q);
  const rawCategory = firstValue(searchParams.category);
  const rawSort = firstValue(searchParams.sort);
  const rawPage = firstValue(searchParams.page);
  const q = rawQuery === "" ? undefined : rawQuery.replace(/\s+/g, " ");
  const category = rawCategory === "" ? undefined : rawCategory.toLowerCase();
  const minPrice = parsePrice(
    firstValue(searchParams.minPrice),
    "Minimum price",
    errors,
  );
  const maxPrice = parsePrice(
    firstValue(searchParams.maxPrice),
    "Maximum price",
    errors,
  );

  if (q !== undefined && (q.length < 2 || q.length > 200)) {
    errors.push("Search must contain between 2 and 200 characters.");
  }
  if (
    category !== undefined &&
    (category.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category))
  ) {
    errors.push("Category must be a valid catalog slug.");
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    errors.push("Minimum price must not exceed maximum price.");
  }

  let sort: CatalogSortValue = "rating";
  if (rawSort !== "") {
    if (allowedSortValues.has(rawSort as CatalogSortValue)) {
      sort = rawSort as CatalogSortValue;
    } else {
      errors.push("Sort must use a supported price or rating option.");
    }
  }

  let page = 1;
  if (rawPage !== "") {
    if (/^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage))) {
      page = Number(rawPage);
    } else {
      errors.push("Page must be a positive integer.");
    }
  }

  return {
    state: {
      ...(q === undefined ? {} : { q }),
      ...(category === undefined ? {} : { category }),
      ...(minPrice === undefined ? {} : { minPrice }),
      ...(maxPrice === undefined ? {} : { maxPrice }),
      sort,
      page,
    },
    errors,
  };
}

function apiSort(sort: CatalogSortValue): ProductSortValue {
  return sort === "rating" ? "rating_desc" : sort;
}

export function toProductListQuery(state: CatalogUrlState): ProductListQuery {
  return {
    page: state.page,
    pageSize: CATALOG_PAGE_SIZE,
    ...(state.category === undefined ? {} : { category: state.category }),
    ...(state.minPrice === undefined ? {} : { minPrice: state.minPrice }),
    ...(state.maxPrice === undefined ? {} : { maxPrice: state.maxPrice }),
    sort: apiSort(state.sort),
  };
}

export function toProductSearchQuery(
  state: CatalogUrlState & { readonly q: string },
): ProductSearchQuery {
  return { ...toProductListQuery(state), q: state.q };
}

export function catalogSearchParams(
  state: CatalogUrlState,
  page = state.page,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q !== undefined) params.set("q", state.q);
  if (state.category !== undefined) params.set("category", state.category);
  if (state.minPrice !== undefined)
    params.set("minPrice", String(state.minPrice));
  if (state.maxPrice !== undefined)
    params.set("maxPrice", String(state.maxPrice));
  params.set("sort", state.sort);
  params.set("page", String(page));
  return params;
}

export function catalogHref(state: CatalogUrlState, page = state.page): string {
  return `/products?${catalogSearchParams(state, page).toString()}`;
}
