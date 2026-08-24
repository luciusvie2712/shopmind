import type { CategoryContract, ProductDetailContract } from "@shopmind/contracts";
import { ApiClientError, getCategories, getProduct, getProducts } from "@/lib/api/client";
import type { HomeCatalogData, HomeCategoryItem } from "@/features/home/types";

const categoryDefinitions = [
  {
    displayName: "Laptops",
    slugs: ["laptops"],
    subtitle: "Explore laptops",
    tone: "teal",
  },
  {
    displayName: "Smartphones",
    slugs: ["smartphones", "mobile-accessories"],
    subtitle: "Explore phones",
    tone: "blue",
  },
  {
    displayName: "Furniture",
    slugs: ["furniture"],
    subtitle: "Explore furniture",
    tone: "amber",
  },
  {
    displayName: "Beauty",
    slugs: ["beauty", "skin-care"],
    subtitle: "Explore beauty",
    tone: "rose",
  },
  {
    displayName: "Home Decor",
    slugs: ["home-decoration", "home-decor"],
    subtitle: "Explore decor",
    tone: "violet",
  },
] as const;

function requestId(error: unknown): string | undefined {
  return error instanceof ApiClientError ? error.requestId : undefined;
}

function matchCategory(
  categories: readonly CategoryContract[],
  slugs: readonly string[],
): CategoryContract | undefined {
  return slugs
    .map((slug) => categories.find((category) => category.slug === slug))
    .find((category) => category !== undefined);
}

export async function loadHomeCatalog(): Promise<HomeCatalogData> {
  const [categoriesResult, productsResult, previewResult, compareResult] = await Promise.allSettled([
    getCategories(),
    getProducts({ page: 1, pageSize: 6, sort: "rating_desc" }),
    getProducts({
      page: 1,
      pageSize: 3,
      category: "laptops",
      maxPrice: 1200,
      sort: "rating_desc",
    }),
    getProducts({
      page: 1,
      pageSize: 3,
      category: "laptops",
      sort: "rating_desc",
    }),
  ]);

  const productsState = await loadProductState(productsResult, previewResult, compareResult);
  const categoriesState = await loadCategoryState(categoriesResult);
  return { categories: categoriesState, products: productsState };
}

async function loadProductState(
  result: PromiseSettledResult<Awaited<ReturnType<typeof getProducts>>>,
  previewResult: PromiseSettledResult<Awaited<ReturnType<typeof getProducts>>>,
  compareResult: PromiseSettledResult<Awaited<ReturnType<typeof getProducts>>>,
): Promise<HomeCatalogData["products"]> {
  if (result.status === "rejected") {
    return { status: "error", requestId: requestId(result.reason) };
  }
  if (result.value.items.length === 0) return { status: "empty" };

  const items = result.value.items.slice(0, 6);
  const previewItems =
    previewResult.status === "fulfilled" ? previewResult.value.items.slice(0, 3) : [];
  const compareItems =
    compareResult.status === "fulfilled" ? compareResult.value.items.slice(0, 3) : [];
  const detailProducts = [...items, ...previewItems, ...compareItems].filter(
    (product, index, products) =>
      products.findIndex(({ id }) => id === product.id) === index,
  );
  const detailsResults = await Promise.allSettled(
    detailProducts.map((product) => getProduct(product.id)),
  );
  const details = detailsResults.flatMap((detail) =>
    detail.status === "fulfilled" ? [detail.value] : [],
  );
  const reviewCounts = Object.fromEntries(
    details.map((detail) => [detail.id, detail.reviews.length]),
  );
  return {
    status: "success",
    items,
    previewItems,
    compareItems,
    details,
    reviewCounts,
  };
}

async function loadCategoryState(
  result: PromiseSettledResult<readonly CategoryContract[]>,
): Promise<HomeCatalogData["categories"]> {
  if (result.status === "rejected") {
    return { status: "error", requestId: requestId(result.reason) };
  }
  if (result.value.length === 0) return { status: "empty" };

  const matched = categoryDefinitions.flatMap((definition) => {
    const category = matchCategory(result.value, definition.slugs);
    return category ? [{ definition, category }] : [];
  });
  if (matched.length === 0) return { status: "empty" };

  const productResults = await Promise.allSettled(
    matched.map(({ category }) =>
      getProducts({ page: 1, pageSize: 1, category: category.slug, sort: "rating_desc" }),
    ),
  );
  const items: HomeCategoryItem[] = matched.map(
    ({ definition, category }, index) => ({
      category,
      displayName: definition.displayName,
      subtitle: definition.subtitle,
      tone: definition.tone,
      thumbnail:
        productResults[index]?.status === "fulfilled"
          ? productResults[index].value.items[0]?.thumbnail ?? null
          : null,
    }),
  );
  return { status: "success", items };
}

export function productDetailsById(
  details: readonly ProductDetailContract[],
): ReadonlyMap<string, ProductDetailContract> {
  return new Map(details.map((detail) => [detail.id, detail]));
}
