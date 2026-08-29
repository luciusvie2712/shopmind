import { ImageSearch } from "@/features/ai/image-search";
export default function ImageSearchPage() {
  return <main className="page-shell py-10"><header className="mb-8"><p className="page-kicker">Multimodal discovery</p><h1 className="mt-2 text-3xl font-extrabold text-slate-950">Search with an image</h1><p className="mt-2 text-sm text-slate-600">Find canonical ShopMind products in Gemini Embedding 2&apos;s shared text-image space.</p></header><ImageSearch /></main>;
}
