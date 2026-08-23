import { AiSearch } from "@/features/ai/ai-search";

export default function AiSearchPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-indigo-700">Grounded discovery</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
        AI product search
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Describe your need naturally. ShopMind validates the intent, enforces hard constraints, ranks canonical products, and asks Gemini only for grounded explanations.
      </p>
      <div className="mt-8">
        <AiSearch />
      </div>
    </main>
  );
}
