import { ArrowRight, Box } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import type { HomeCatalogData } from "@/features/home/types";
import { CompactDataState } from "./compact-data-state";

const toneClasses = {
  teal: "border-teal-100 bg-teal-50/70",
  blue: "border-blue-100 bg-blue-50/70",
  amber: "border-amber-100 bg-amber-50/70",
  rose: "border-rose-100 bg-rose-50/70",
  violet: "border-violet-100 bg-violet-50/70",
} as const;

export function FeaturedCategories({
  state,
}: {
  readonly state: HomeCatalogData["categories"];
}) {
  return (
    <section aria-labelledby="featured-categories-title" className="home-section pt-12 lg:pt-16">
      <h2 id="featured-categories-title" className="sr-only">
        Featured categories
      </h2>
      {state.status === "error" ? (
        <CompactDataState
          kind="error"
          message="Featured categories are temporarily unavailable."
          requestId={state.requestId}
        />
      ) : state.status === "empty" ? (
        <CompactDataState kind="empty" message="No featured categories available." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {state.items.map((item, index) => (
            <Reveal key={item.category.id} delay={index * 70}>
              <Link
                href={`/products?category=${encodeURIComponent(item.category.slug)}`}
                className={`group block overflow-hidden rounded-[20px] border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-md motion-reduce:transform-none ${toneClasses[item.tone]}`}
              >
                <div className="relative mx-auto h-28 w-full overflow-hidden">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={`Featured ${item.displayName.toLowerCase()} product`}
                      fill
                      sizes="(min-width: 1024px) 18vw, (min-width: 640px) 33vw, 100vw"
                      className="object-contain p-1 transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <Box className="mx-auto mt-8 size-10 text-slate-400" aria-hidden="true" />
                  )}
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-950">
                  {item.displayName}
                </h3>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                  {item.subtitle}
                  <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
