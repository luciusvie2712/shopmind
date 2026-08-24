import { AiSearchPreview } from "./ai-search-preview";
import { ComparePreview } from "./compare-preview";
import { FeaturedCategories } from "./featured-categories";
import { FeaturedProducts } from "./featured-products";
import { loadHomeCatalog } from "@/features/home/lib/home-catalog";

export async function HomeCatalogContent() {
  const data = await loadHomeCatalog();
  return (
    <>
      <FeaturedCategories state={data.categories} />
      <FeaturedProducts state={data.products} />
      <AiSearchPreview state={data.products} />
      <ComparePreview state={data.products} />
    </>
  );
}
