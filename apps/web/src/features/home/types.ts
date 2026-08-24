import type {
  CategoryContract,
  ProductDetailContract,
  ProductSummaryContract,
} from "@shopmind/contracts";

export interface HomeCategoryItem {
  readonly category: CategoryContract;
  readonly displayName: string;
  readonly subtitle: string;
  readonly thumbnail: string | null;
  readonly tone: "teal" | "blue" | "amber" | "rose" | "violet";
}

export interface HomeCatalogData {
  readonly categories:
    | { readonly status: "success"; readonly items: readonly HomeCategoryItem[] }
    | { readonly status: "empty" }
    | { readonly status: "error"; readonly requestId?: string };
  readonly products:
    | {
        readonly status: "success";
        readonly items: readonly ProductSummaryContract[];
        readonly previewItems: readonly ProductSummaryContract[];
        readonly compareItems: readonly ProductSummaryContract[];
        readonly details: readonly ProductDetailContract[];
        readonly reviewCounts: Readonly<Record<string, number>>;
      }
    | { readonly status: "empty" }
    | { readonly status: "error"; readonly requestId?: string };
}
