import { CompareView } from "@/features/compare/compare-view";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ readonly ids?: string | string[] }>;
}) {
  const ids = (await searchParams).ids;
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-indigo-700">Canonical comparison</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
        Compare products
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Product facts come from ShopMind. Gemini only summarizes the selected canonical products.
      </p>
      <div className="mt-8">
        <CompareView rawIds={typeof ids === "string" ? ids : undefined} />
      </div>
    </main>
  );
}
