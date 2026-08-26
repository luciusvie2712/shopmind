import { AiSearch } from "@/features/ai/ai-search";
import { TrustSection } from "@/features/home/components/trust-section";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export default async function AiSearchPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly query?: string | readonly string[] }>;
}) {
  const rawQuery = (await searchParams).query;
  const initialQuery = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  return (
    <main className="overflow-x-clip bg-white/75">
      <div className="page-shell pt-6 sm:pt-7 lg:pt-8">
        <nav
          aria-label="Breadcrumb"
          className="hero-enter hero-enter-1 flex items-center gap-2 text-xs font-medium text-slate-500"
        >
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-teal-700">
            <Home className="size-3.5" aria-hidden="true" /> Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span aria-current="page" className="text-slate-700">AI Search</span>
        </nav>

        <header className="hero-enter hero-enter-2 mt-5">
          <p className="page-kicker-ai">Grounded discovery</p>
          <h1 className="page-title">AI Search</h1>
          <p className="page-description mt-2">
            Describe your need naturally. ShopMind validates the intent, enforces hard constraints, ranks canonical products, and asks Gemini only for grounded explanations.
          </p>
        </header>

        <div className="hero-enter hero-enter-3 mt-8">
          <AiSearch initialQuery={initialQuery} />
        </div>
      </div>
      <TrustSection />
    </main>
  );
}
