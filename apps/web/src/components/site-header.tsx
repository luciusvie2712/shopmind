"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();

  async function signOut() {
    try {
      await logout();
    } catch {
      // Local auth state is cleared even if server revocation is unavailable.
    } finally {
      router.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-slate-950"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span>ShopMind</span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          <NavigationItems userPresent={user !== null} ready={ready} signOut={signOut} />
        </nav>
        <details className="group relative md:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav
            aria-label="Mobile primary navigation"
            className="absolute right-0 top-12 flex w-56 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            <NavigationItems userPresent={user !== null} ready={ready} signOut={signOut} mobile />
          </nav>
        </details>
      </div>
    </header>
  );
}

function NavigationItems({
  userPresent,
  ready,
  signOut,
  mobile = false,
}: {
  readonly userPresent: boolean;
  readonly ready: boolean;
  readonly signOut: () => Promise<void>;
  readonly mobile?: boolean;
}) {
  const linkClass = `${mobile ? "w-full" : ""} rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950`;
  return (
    <>
      <Link href="/" className={linkClass}>Home</Link>
      <Link href="/products" className={linkClass}>Products</Link>
      <Link href="/search/ai" className={linkClass}>AI Search</Link>
      {userPresent ? (
        <>
          <Link href="/assistant" className={linkClass}>Assistant</Link>
          <Link href="/cart" className={linkClass}>Cart</Link>
          <Link href="/wishlist" className={linkClass}>Wishlist</Link>
          <Link href="/orders" className={linkClass}>Orders</Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className={`${linkClass} text-left`}
          >
            Sign out
          </button>
        </>
      ) : ready ? (
        <Link href="/login" className={`${linkClass} ${mobile ? "" : "bg-slate-950 text-white hover:bg-slate-800 hover:text-white"}`}>
          Sign in
        </Link>
      ) : null}
    </>
  );
}
