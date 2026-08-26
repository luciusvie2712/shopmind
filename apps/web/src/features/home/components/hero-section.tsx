import {
  BadgeCheck,
  Database,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import heroBackground from "@/assets/bg-hero-section.png";
import { HeroSearch } from "@/features/home/components/hero-search";

const trustIndicators = [
  { label: "Grounded recommendations", icon: BadgeCheck },
  { label: "Canonical product data", icon: Database },
  { label: "Trust & transparency", icon: ShieldCheck },
] as const;

const animatedTitle = "faster with AI";

export function HeroSection() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="home-hero relative isolate flex min-h-[calc(100svh-72px)] items-center overflow-hidden bg-[#f7f8fc] bg-[length:100%_auto] bg-top bg-no-repeat px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20"
      style={{ backgroundImage: `url(${heroBackground.src})` }}
    >
      <div className="absolute inset-0 -z-10 bg-white/[0.06] max-sm:bg-white/50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[28%] bg-gradient-to-b from-transparent via-white/75 to-white"
        aria-hidden="true"
      />
      <div className="mx-auto flex w-full max-w-[920px] flex-col items-center text-center">
        <div className="hero-enter hero-enter-1 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/90 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-sm sm:text-sm">
          <Sparkles className="size-4" aria-hidden="true" />
          AI-powered product discovery
        </div>
        <h1
          id="home-hero-title"
          className="hero-enter hero-enter-2 mt-6 max-w-[900px] text-[2.55rem] font-extrabold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.25rem]"
        >
          Find the right products,
          <span
            aria-label={animatedTitle}
            className="mt-1 block"
          >
            {Array.from(animatedTitle).map((character, index) => (
              <span
                key={`${character}-${index}`}
                aria-hidden="true"
                className="hero-title-letter inline-block"
                style={{ "--hero-letter-index": index } as CSSProperties}
              >
                {character === " " ? "\u00A0" : character}
              </span>
            ))}
          </span>
        </h1>
        <p className="hero-enter hero-enter-3 mt-6 max-w-[680px] text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          ShopMind understands what you need and surfaces the best products from
          trusted sources—so you can buy with confidence.
        </p>
        <div className="hero-enter hero-enter-4 mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-teal-500 hover:shadow-md motion-reduce:transform-none sm:h-14 sm:text-base"
          >
            <ShoppingBag className="size-5" aria-hidden="true" /> Browse Products
          </Link>
          <Link
            href="/search/ai"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-6 text-sm font-bold text-slate-950 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md motion-reduce:transform-none sm:h-14 sm:text-base"
          >
            <Sparkles className="size-5" aria-hidden="true" /> Try AI Search
          </Link>
        </div>
        <div className="hero-enter hero-enter-5 mt-8 w-full">
          <HeroSearch />
        </div>
        <div className="hero-enter hero-enter-6 mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs font-medium text-slate-700 sm:text-sm">
          {trustIndicators.map(({ label, icon: Icon }) => (
            <span key={label} className="inline-flex items-center gap-2">
              <Icon className="size-4 text-teal-600" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
