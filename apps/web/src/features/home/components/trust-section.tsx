import { CreditCard, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const trustItems = [
  {
    title: "Canonical & trustworthy data",
    description: "Authorized sources are normalized into ShopMind's canonical catalog.",
    icon: ShieldCheck,
    tone: "bg-teal-50 text-teal-700",
  },
  {
    title: "Grounded AI recommendations",
    description: "Every suggestion keeps reasons, trade-offs, and verified facts distinct.",
    icon: Sparkles,
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Wishlist & cart support",
    description: "Save favorites, build your cart, and shop when you're ready.",
    icon: Heart,
    tone: "bg-rose-50 text-rose-600",
  },
  {
    title: "Simulated checkout",
    description: "Practice the full checkout flow with backend-authoritative totals.",
    icon: CreditCard,
    tone: "bg-blue-50 text-blue-700",
  },
] as const;

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className="home-section py-16 lg:py-20">
      <h2 id="trust-title" className="text-center text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
        Built for trust. Designed for you.
      </h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map(({ title, description, icon: Icon, tone }, index) => (
          <Reveal key={title} delay={index * 80}>
            <article className="flex h-full gap-4 rounded-2xl border border-transparent p-3 transition duration-300 hover:-translate-y-1 hover:border-slate-200 hover:bg-white hover:shadow-sm motion-reduce:transform-none">
              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${tone}`}>
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
