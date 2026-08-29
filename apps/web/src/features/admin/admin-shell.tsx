"use client";

import {
  Bot,
  Boxes,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  ListOrdered,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { useAuth } from "@/features/auth/auth-provider";

const navigation = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/ingestion", label: "Ingestion", icon: RefreshCw },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/orders", label: "Đơn hàng", icon: ListOrdered },
  { href: "/admin/payments", label: "Thanh toán", icon: CreditCard },
  { href: "/admin/products", label: "Sản phẩm", icon: Boxes },
  { href: "/admin/ai-logs", label: "AI logs", icon: Bot },
] as const;

export function AdminShell({ children }: { readonly children: ReactNode }) {
  return (
    <ProtectedRoute
      loadingFallback={
        <div className="page-shell py-10">
          <div className="skeleton-block h-[32rem]" />
        </div>
      }
    >
      <AdminRoleBoundary>{children}</AdminRoleBoundary>
    </ProtectedRoute>
  );
}

function AdminRoleBoundary({ children }: { readonly children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (user?.role !== "ADMIN") {
    return (
      <main className="page-shell py-16">
        <section className="surface-card mx-auto max-w-xl p-10 text-center">
          <h1 className="text-2xl font-extrabold text-slate-950">
            Không có quyền truy cập
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Dashboard vận hành chỉ dành cho tài khoản ADMIN. Quyền truy cập vẫn
            được kiểm tra lại tại API.
          </p>
          <Link href="/" className="btn-primary mt-6">
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50/50">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-0 top-32 size-96 rounded-full bg-cyan-200/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 left-64 size-80 rounded-full bg-indigo-200/15 blur-3xl"
      />
      <aside className="fixed bottom-0 left-0 top-[72px] z-30 hidden w-64 overflow-y-auto border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-teal-950 px-4 py-6 shadow-[18px_0_50px_rgba(15,23,42,0.12)] lg:block">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-teal-500/15 blur-3xl"
        />
        <div className="relative px-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-400">
            ShopMind
          </p>
          <p className="mt-1 text-lg font-extrabold text-white">
            Admin console
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Canonical operations data
          </p>
        </div>
        <nav aria-label="Admin navigation" className="relative mt-7 space-y-1">
          {navigation.map(({ href, label, icon: Icon, ...item }) => {
            const active =
              "exact" in item ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition duration-200 ${active ? "border-teal-300/70 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 shadow-[0_10px_28px_rgba(20,184,166,0.28)]" : "border-transparent text-slate-300 hover:translate-x-1 hover:border-slate-700 hover:bg-slate-900/80 hover:text-white motion-reduce:transform-none"}`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-lg transition ${active ? "bg-white/35" : "bg-slate-800 group-hover:bg-teal-500/15 group-hover:text-teal-300"}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex-1">{label}</span>
                <ChevronRight
                  className={`size-4 transition ${active ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>
        <div className="relative mt-8 rounded-2xl border border-teal-800/60 bg-gradient-to-br from-slate-900 to-teal-950 p-4 shadow-inner shadow-teal-950/50">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Signed in
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-white">
            {user.email}
          </p>
          <p className="mt-1 text-xs text-teal-400">Administrator</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <nav
          aria-label="Mobile admin navigation"
          className="sticky top-[72px] z-20 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
        >
          <div className="flex min-w-max gap-2">
            {navigation.map(({ href, label, icon: Icon, ...item }) => {
              const active =
                "exact" in item ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold shadow-sm transition ${active ? "border-teal-500 bg-gradient-to-r from-teal-600 to-cyan-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"}`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
        <main className="relative mx-auto max-w-[1500px] px-4 py-8 sm:px-6 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
