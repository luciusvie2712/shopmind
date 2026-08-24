"use client";

import Link from "next/link";
import {
  Heart,
  ListOrdered,
  LogOut,
  Menu,
  MessageCircleMore,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/features/auth/auth-provider";

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function updateScrolled(): void {
      setScrolled(window.scrollY > 12);
    }
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

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
    <header
      className={`site-header-enter sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md transition-[border-color,box-shadow] duration-200 ${
        scrolled
          ? "border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          : "border-slate-200/70 shadow-none"
      }`}
    >
      <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto] items-center px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        <BrandLogo />
        <nav aria-label="Primary navigation" className="hidden items-stretch gap-7 lg:flex">
          <NavigationItems
            pathname={pathname}
            userPresent={user !== null}
            ready={ready}
            signOut={signOut}
            section="main"
          />
        </nav>
        <div className="hidden justify-self-end lg:flex">
          <NavigationItems
            pathname={pathname}
            userPresent={user !== null}
            ready={ready}
            signOut={signOut}
            section="auth"
          />
        </div>
        <details className="group relative justify-self-end lg:hidden">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-700 [&::-webkit-details-marker]:hidden">
            <Menu className="size-4" aria-hidden="true" /> Menu
          </summary>
          <nav
            aria-label="Mobile primary navigation"
            className="absolute right-0 top-12 flex w-60 flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            <NavigationItems
              pathname={pathname}
              userPresent={user !== null}
              ready={ready}
              signOut={signOut}
              mobile
            />
          </nav>
        </details>
      </div>
    </header>
  );
}

function NavigationItems({
  pathname,
  userPresent,
  ready,
  signOut,
  mobile = false,
  section = "all",
}: {
  readonly pathname: string;
  readonly userPresent: boolean;
  readonly ready: boolean;
  readonly signOut: () => Promise<void>;
  readonly mobile?: boolean;
  readonly section?: "main" | "auth" | "all";
}) {
  const mainLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/search/ai", label: "AI Search" },
  ] as const;
  const authLinks = [
    { href: "/assistant", label: "Assistant", icon: MessageCircleMore },
    { href: "/cart", label: "Cart", icon: ShoppingBag },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
    { href: "/orders", label: "Orders", icon: ListOrdered },
  ] as const;

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const linkClass = mobile
    ? "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-700"
    : "relative inline-flex h-[72px] items-center px-1 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:text-teal-700";

  return (
    <>
      {section !== "auth" ? mainLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={`${linkClass} ${
            isActive(link.href) ? "text-teal-700" : ""
          }`}
        >
          {link.label}
          {!mobile && isActive(link.href) ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-600" />
          ) : null}
        </Link>
      )) : null}
      {section !== "main" && userPresent ? (
        <>
          {authLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`${linkClass} ${isActive(href) ? "text-teal-700" : ""}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void signOut()}
            className={`${linkClass} text-left`}
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </>
      ) : section !== "main" && ready ? (
        <Link
          href="/login"
          className={`${linkClass} ${
            mobile
              ? ""
              : "ml-4 h-auto self-center rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 shadow-sm hover:border-teal-200 hover:text-teal-700"
          }`}
        >
          <UserRound className="size-4" aria-hidden="true" /> Sign in
        </Link>
      ) : null}
    </>
  );
}
