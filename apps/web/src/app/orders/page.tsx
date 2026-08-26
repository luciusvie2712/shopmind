// apps/web/src/app/orders/page.tsx
"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { OrdersPageContent } from "@/features/orders/orders-page-content";
import { OrdersPageSkeleton } from "@/features/orders/orders-page-skeleton";

export default function OrdersPage() {
  return (
    <main className="overflow-x-clip bg-white/70">
      <div className="page-shell pt-6 sm:pt-7 lg:pt-8">
        <ProtectedRoute loadingFallback={<OrdersPageSkeleton />}>
          <nav
            aria-label="Breadcrumb"
            className="hero-enter hero-enter-1 flex items-center gap-2 text-xs font-medium text-slate-500"
          >
            <Link href="/" className="transition-colors hover:text-teal-700">Home</Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-slate-700">Orders</span>
          </nav>
          <header className="hero-enter hero-enter-2 mt-5">
            <h1 className="page-title mt-0">Orders</h1>
          </header>
          <div className="hero-enter hero-enter-3 mt-8">
            <OrdersPageContent />
          </div>
        </ProtectedRoute>
      </div>
    </main>
  );
}
