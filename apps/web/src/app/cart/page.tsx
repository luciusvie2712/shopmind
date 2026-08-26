"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { CartPageContent } from "@/features/cart/cart-page-content";
import { CartPageSkeleton } from "@/features/cart/cart-page-skeleton";
import { TrustSection } from "@/features/home/components/trust-section";

export default function CartPage() {
  return (
    <main className="overflow-x-clip bg-white/70">
      <div className="page-shell pt-6 sm:pt-7 lg:pt-8">
        <ProtectedRoute loadingFallback={<CartPageSkeleton />}>
          <nav
            aria-label="Breadcrumb"
            className="hero-enter hero-enter-1 flex items-center gap-2 text-xs font-medium text-slate-500"
          >
            <Link href="/" className="transition-colors hover:text-teal-700">Home</Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-slate-700">Cart</span>
          </nav>
          <header className="hero-enter hero-enter-2 mt-5">
            <h1 className="page-title mt-0">Your cart</h1>
          </header>
          <div className="hero-enter hero-enter-3 mt-8">
            <CartPageContent />
          </div>
        </ProtectedRoute>
      </div>
      <TrustSection />
    </main>
  );
}
