import { Boxes, Heart, Layers3, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";

const capabilities = [
  { label: "Search canonical products", icon: Search },
  { label: "Inspect product details", icon: Boxes },
  { label: "Compare product facts", icon: Layers3 },
  { label: "Read categories and preferences", icon: SlidersHorizontal },
  { label: "Use wishlist context", icon: Heart },
] as const;

export function AssistantContextPanel() {
  return (
    <aside aria-labelledby="assistant-context-title" className="space-y-5">
      <section className="surface-card overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="assistant-context-title" className="font-bold text-slate-950">Discovery context</h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">Read-only</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Available capabilities are bounded by the ShopMind assistant.</p>
        </div>
        <ul className="divide-y divide-slate-100 p-2" aria-label="Assistant capabilities">
          {capabilities.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-indigo-700">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="font-medium leading-5">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/70 p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-white text-teal-700 shadow-sm">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-bold text-slate-950">Focused on discovery</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Ask about products, categories, comparisons, preferences, or your wishlist. Tools are read-only.</p>
      </section>
    </aside>
  );
}
