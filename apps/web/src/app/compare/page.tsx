import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CompareView } from "@/features/compare/compare-view";
import { TrustSection } from "@/features/home/components/trust-section";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ readonly ids?: string | string[] }>;
}) {
  const ids = (await searchParams).ids;
  return (
    <>
      <main className="page-shell">
        <nav aria-label="Breadcrumb" className="hero-enter hero-enter-1">
          <ol className="flex items-center gap-2 text-sm text-slate-500">
            <li>
              <Link href="/" className="transition-colors hover:text-teal-700">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4" />
            </li>
            <li aria-current="page" className="font-semibold text-slate-700">
              Compare
            </li>
          </ol>
        </nav>
        <header className="hero-enter hero-enter-2 mt-5">
          <p className="page-kicker-ai">Canonical comparison</p>
          <h1 className="page-title">Compare products</h1>
          <p className="page-description">
            Product facts come from ShopMind. Gemini only summarizes the selected canonical products.
          </p>
        </header>
        <div className="hero-enter hero-enter-3 mt-8">
          <CompareView rawIds={typeof ids === "string" ? ids : undefined} />
        </div>
      </main>
      <TrustSection />
    </>
  );
}
