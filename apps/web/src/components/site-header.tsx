"use client";

import type { UserContract } from "@shopmind/contracts";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  ListOrdered,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleMore,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/features/auth/auth-provider";

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mobileMenuRef = useDismissibleDetails(pathname);
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
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-2 lg:flex"
        >
          <NavigationItems
            pathname={pathname}
            user={user}
            ready={ready}
            signOut={signOut}
            section="main"
          />
        </nav>
        <div className="hidden items-center justify-self-end gap-1 lg:flex">
          <NavigationItems
            pathname={pathname}
            user={user}
            ready={ready}
            signOut={signOut}
            section="auth"
          />
        </div>
        <details
          ref={mobileMenuRef}
          className="group relative justify-self-end lg:hidden"
        >
          <summary
            aria-label="Main menu"
            className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/70 hover:text-teal-800 hover:shadow-md group-open:border-teal-200 group-open:bg-teal-50 group-open:text-teal-800 group-open:shadow-md motion-reduce:transform-none [&::-webkit-details-marker]:hidden"
          >
            <Menu className="size-4" aria-hidden="true" /> Menu
          </summary>
          <nav
            aria-label="Mobile primary navigation"
            className="animate-in fade-in zoom-in-95 absolute right-0 top-12 flex w-60 origin-top-right flex-col rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl duration-200 motion-reduce:animate-none"
          >
            <NavigationItems
              pathname={pathname}
              user={user}
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
  user,
  ready,
  signOut,
  mobile = false,
  section = "all",
}: {
  readonly pathname: string;
  readonly user: UserContract | null;
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
    ? "group relative flex w-full items-center gap-2 overflow-hidden rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 hover:translate-x-1 hover:border-teal-100 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50/70 hover:text-teal-800 hover:shadow-sm motion-reduce:transform-none"
    : "group relative inline-flex h-11 items-center overflow-hidden rounded-xl border border-transparent px-3 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-100 hover:bg-gradient-to-br hover:from-teal-50 hover:via-white hover:to-cyan-50/80 hover:text-teal-800 hover:shadow-[0_8px_22px_rgba(13,148,136,0.12)] motion-reduce:transform-none";

  return (
    <>
      {section !== "auth"
        ? mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`${linkClass} ${
                isActive(link.href)
                  ? mobile
                    ? "border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-900 shadow-sm ring-1 ring-inset ring-teal-200/80"
                    : "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 text-teal-900 shadow-[0_8px_24px_rgba(13,148,136,0.14)] ring-1 ring-inset ring-teal-200/80"
                  : ""
              }`}
            >
              <span className="relative z-10">{link.label}</span>
              <span
                aria-hidden="true"
                className={`absolute rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 transition-all duration-300 ${
                  mobile
                    ? `inset-y-2 left-0 w-1 ${isActive(link.href) ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 group-hover:scale-y-75 group-hover:opacity-70"}`
                    : `inset-x-3 bottom-1 h-0.5 origin-center ${isActive(link.href) ? "scale-x-100 opacity-100 shadow-[0_0_8px_rgba(6,182,212,0.55)]" : "scale-x-0 opacity-0 group-hover:scale-x-75 group-hover:opacity-70"}`
                }`}
              />
            </Link>
          ))
        : null}
      {section !== "main" && user !== null ? (
        <>
          {authLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={mobile ? undefined : label}
              aria-current={isActive(href) ? "page" : undefined}
              title={mobile ? undefined : label}
              className={
                mobile
                  ? `${linkClass} ${isActive(href) ? "border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-900 shadow-sm ring-1 ring-inset ring-teal-200/80" : ""}`
                  : `group relative grid size-11 place-items-center rounded-xl border border-transparent text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-teal-100 hover:bg-gradient-to-br hover:from-teal-50 hover:to-cyan-50 hover:text-teal-800 hover:shadow-[0_8px_22px_rgba(13,148,136,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transform-none ${
                      isActive(href)
                        ? "border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-900 shadow-[0_7px_20px_rgba(13,148,136,0.14)] ring-1 ring-inset ring-teal-200/80"
                        : ""
                    }`
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {mobile ? label : <span className="sr-only">{label}</span>}
              {!mobile && isActive(href) ? (
                <span className="absolute -bottom-0.5 size-1.5 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.65)]" />
              ) : null}
            </Link>
          ))}
          <AccountMenu
            user={user}
            signOut={signOut}
            mobile={mobile}
            pathname={pathname}
          />
        </>
      ) : section !== "main" && ready ? (
        <Link
          href="/login"
          className={`${linkClass} ${
            mobile
              ? ""
              : "ml-4 h-auto self-center rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-teal-200 hover:bg-gradient-to-br hover:from-teal-50 hover:to-cyan-50 hover:text-teal-800 hover:shadow-md motion-reduce:transform-none"
          }`}
        >
          <UserRound className="size-4" aria-hidden="true" /> Sign in
        </Link>
      ) : null}
    </>
  );
}

function AccountMenu({
  user,
  signOut,
  mobile,
  pathname,
}: {
  readonly user: UserContract;
  readonly signOut: () => Promise<void>;
  readonly mobile: boolean;
  readonly pathname: string;
}) {
  const menuRef = useDismissibleDetails(pathname);

  return (
    <details
      ref={menuRef}
      className={`group/account relative ${mobile ? "mt-1 border-t border-slate-100 pt-1" : "ml-1"}`}
    >
      <summary
        aria-label={`Account menu for ${user.name}`}
        title={mobile ? undefined : "Account"}
        className={
          mobile
            ? "flex w-full cursor-pointer list-none items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 hover:translate-x-1 hover:border-teal-100 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 hover:text-teal-800 group-open/account:border-teal-200 group-open/account:bg-gradient-to-r group-open/account:from-teal-50 group-open/account:to-cyan-50 group-open/account:text-teal-900 group-open/account:shadow-sm motion-reduce:transform-none [&::-webkit-details-marker]:hidden"
            : "grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-gradient-to-br hover:from-teal-50 hover:to-cyan-50 hover:text-teal-800 hover:shadow-[0_8px_22px_rgba(13,148,136,0.15)] group-open/account:border-teal-300 group-open/account:bg-gradient-to-br group-open/account:from-teal-50 group-open/account:to-cyan-50 group-open/account:text-teal-900 group-open/account:shadow-[0_8px_24px_rgba(13,148,136,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transform-none [&::-webkit-details-marker]:hidden"
        }
      >
        <UserRound
          className={mobile ? "size-4" : "size-5"}
          aria-hidden="true"
        />
        {mobile ? (
          <>
            <span className="min-w-0 flex-1 truncate text-left">
              {user.name}
            </span>
            <ChevronDown
              className="size-4 transition-transform group-open/account:rotate-180"
              aria-hidden="true"
            />
          </>
        ) : (
          <span className="sr-only">Account</span>
        )}
      </summary>
      <div
        className={
          mobile
            ? "mt-1 rounded-xl bg-slate-50 p-2"
            : "animate-in fade-in zoom-in-95 absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl duration-200 motion-reduce:animate-none"
        }
      >
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="truncate text-sm font-bold text-slate-900">
            {user.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
        </div>
        {user.role === "ADMIN" ? (
          <Link
            href="/admin"
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <LayoutDashboard className="size-4" aria-hidden="true" /> Dashboard
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (menuRef.current) menuRef.current.open = false;
            void signOut();
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </details>
  );
}

function useDismissibleDetails(pathname: string) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const detailsElement: HTMLDetailsElement = details;

    function close(): void {
      detailsElement.open = false;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (
        detailsElement.open &&
        !detailsElement.contains(event.target as Node)
      ) {
        close();
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape" || !detailsElement.open) return;
      close();
      detailsElement.querySelector("summary")?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  return detailsRef;
}
