"use client";

import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AssistantChat } from "@/features/ai/assistant-chat";
import { AssistantPageSkeleton } from "@/features/ai/assistant-page-skeleton";
import { ProtectedRoute } from "@/features/auth/protected-route";

export default function AssistantPage() {
  return (
    <main className="overflow-x-clip bg-white/70">
      <div className="page-shell pt-6 sm:pt-7 lg:pt-8">
        <ProtectedRoute loadingFallback={<AssistantPageSkeleton />}>
          <nav
            aria-label="Breadcrumb"
            className="hero-enter hero-enter-1 flex items-center gap-2 text-xs font-medium text-slate-500"
          >
            <Link href="/" className="transition-colors hover:text-teal-700">
              Home
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-slate-700">
              Assistant
            </span>
          </nav>

          <header className="hero-enter hero-enter-2 mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-kicker-ai">Read-only guidance</p>
              <h1 className="page-title">ShopMind assistant</h1>
              <p className="page-description mt-2">
                The assistant can inspect bounded canonical catalog facts and your wishlist, but cannot perform commerce writes.
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 sm:self-auto">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Read-only assistant
            </div>
          </header>

          <div className="hero-enter hero-enter-3 mt-8">
            <AssistantChat />
          </div>
        </ProtectedRoute>
      </div>
    </main>
  );
}
