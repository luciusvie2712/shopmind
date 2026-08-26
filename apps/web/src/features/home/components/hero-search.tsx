"use client";

import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  heroSearchSchema,
  type HeroSearchValues,
} from "@/features/home/schemas/hero-search.schema";

const SEARCH_PLACEHOLDER =
  "e.g., Find a laptop for backend development under $1200";

export function HeroSearch() {
  const router = useRouter();
  const form = useForm<HeroSearchValues>({ defaultValues: { query: "" } });
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(
    SEARCH_PLACEHOLDER,
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      return;
    }

    let characterIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    function typeNextCharacter(): void {
      characterIndex += 1;
      setAnimatedPlaceholder(SEARCH_PLACEHOLDER.slice(0, characterIndex));

      if (characterIndex < SEARCH_PLACEHOLDER.length) {
        timeoutId = setTimeout(typeNextCharacter, 48);
        return;
      }

      timeoutId = setTimeout(() => {
        setAnimatedPlaceholder("");
        characterIndex = 0;
        timeoutId = setTimeout(typeNextCharacter, 420);
      }, 1_450);
    }

    timeoutId = setTimeout(() => {
      setAnimatedPlaceholder("");
      timeoutId = setTimeout(typeNextCharacter, 360);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  function submit(values: HeroSearchValues): void {
    const parsed = heroSearchSchema.safeParse(values);
    if (!parsed.success) {
      form.setError(
        "query",
        { message: parsed.error.issues[0]?.message },
        { shouldFocus: true },
      );
      return;
    }
    router.push(`/search/ai?query=${encodeURIComponent(parsed.data.query)}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="mx-auto w-full max-w-[820px]"
      noValidate
    >
      <label htmlFor="hero-ai-query" className="sr-only">
        Describe the product you want to find
      </label>
      <div className="flex h-[70px] items-center rounded-[18px] border border-white/90 bg-white/95 p-2 pl-5 shadow-[0_16px_45px_rgba(51,65,85,0.14)] ring-1 ring-slate-200/70 backdrop-blur-sm transition focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100/70 sm:h-[76px] sm:pl-6">
        <Search className="size-5 shrink-0 text-slate-600" aria-hidden="true" />
        <input
          id="hero-ai-query"
          {...form.register("query")}
          maxLength={500}
          aria-invalid={form.formState.errors.query !== undefined}
          aria-describedby={
            form.formState.errors.query ? "hero-ai-query-error" : undefined
          }
          placeholder={animatedPlaceholder}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-950 outline-none placeholder:text-slate-500 sm:px-4 sm:text-base"
        />
        <button
          type="submit"
          aria-label="Open AI search"
          className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-indigo-600 text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-md active:translate-y-0 motion-reduce:transform-none sm:size-14"
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      {form.formState.errors.query ? (
        <p
          id="hero-ai-query-error"
          role="alert"
          className="mx-auto mt-2 w-fit rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-red-700"
        >
          {form.formState.errors.query.message}
        </p>
      ) : null}
    </form>
  );
}
