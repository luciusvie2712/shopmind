import { Sparkles } from "lucide-react";
import Link from "next/link";

export function BrandLogo({ compact = false }: { readonly compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="ShopMind home"
      className="group inline-flex items-center gap-2.5 rounded-lg font-bold tracking-tight text-slate-950 focus-visible:outline-teal-700"
    >
      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-sm motion-reduce:transform-none">
        <span className="absolute -left-2 top-0 size-6 rotate-45 bg-cyan-300/55" />
        <span className="absolute -right-2 bottom-0 size-6 rotate-45 bg-indigo-300/55" />
        <Sparkles className="relative size-4" aria-hidden="true" />
      </span>
      <span className={compact ? "text-lg" : "text-xl"}>ShopMind</span>
    </Link>
  );
}
