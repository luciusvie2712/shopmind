"use client";

import type { SearchIntentContract } from "@shopmind/contracts";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  BrainCircuit,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProductCard } from "@/features/products/product-card";
import { aiSearch, ApiClientError } from "@/lib/api/client";

export const aiSearchFormSchema = z.object({
  query: z.string().trim().min(3, "Describe your need in at least 3 characters").max(500),
});

type AiSearchFormValues = z.infer<typeof aiSearchFormSchema>;

export function AiSearch({ initialQuery = "" }: { readonly initialQuery?: string }) {
  const parsedInitialQuery = aiSearchFormSchema.shape.query.safeParse(initialQuery);
  const form = useForm<AiSearchFormValues>({
    defaultValues: { query: parsedInitialQuery.success ? parsedInitialQuery.data : "" },
  });
  const search = useMutation({
    mutationFn: ({ query }: AiSearchFormValues) => aiSearch({ query }),
  });

  function submit(values: AiSearchFormValues): void {
    const parsed = aiSearchFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setError(
        "query",
        { message: parsed.error.issues[0]?.message },
        { shouldFocus: true },
      );
      return;
    }
    search.mutate(parsed.data);
  }

  const apiError = search.error instanceof ApiClientError ? search.error : null;
  const errorMessage =
    apiError?.code === "AI_PROVIDER_TIMEOUT"
      ? "Gemini timed out before a safe fallback could be produced."
      : apiError?.code === "AI_INVALID_OUTPUT"
        ? "Gemini returned an invalid response and no safe fallback was available."
        : apiError?.code === "API_UNAVAILABLE"
          ? "The ShopMind API is unavailable."
          : "AI search is temporarily unavailable.";

  return (
    <section>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm"
      >
        <label htmlFor="ai-query" className="text-sm font-semibold text-indigo-950">
          What are you shopping for?
        </label>
        <textarea
          id="ai-query"
          {...form.register("query")}
          aria-invalid={form.formState.errors.query !== undefined}
          aria-describedby={form.formState.errors.query ? "ai-query-error" : undefined}
          maxLength={500}
          rows={4}
          placeholder="A lightweight laptop under $1200 for backend development and Docker"
          className="mt-3 w-full resize-y rounded-xl border border-indigo-200 bg-white p-4 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">AI remains read-only and uses canonical ShopMind products.</p>
          <button
            type="submit"
            disabled={search.isPending}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-700 px-5 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-60"
          >
            {search.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4" aria-hidden="true" />
            )}
            {search.isPending ? "Interpreting" : "Discover products"}
          </button>
        </div>
        {form.formState.errors.query ? (
          <p id="ai-query-error" role="alert" className="mt-2 text-sm text-red-700">
            {form.formState.errors.query.message}
          </p>
        ) : null}
      </form>

      {search.isPending ? (
        <div aria-label="AI search pending" className="mt-8 space-y-4">
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-indigo-100" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : null}

      {search.isError ? (
        <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 font-medium text-red-900">
            <AlertTriangle className="size-4" aria-hidden="true" /> {errorMessage}
          </div>
          <button
            type="button"
            disabled={search.variables === undefined}
            onClick={() => search.variables && search.mutate(search.variables)}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-800"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : null}

      {search.isSuccess ? (
        <div className="mt-8 space-y-6">
          <IntentChips intent={search.data.intent} />
          {search.data.status === "fallback" ? (
            <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              AI {search.data.fallback?.stage} was unavailable or invalid. These are deterministic canonical results without fabricated explanations.
              <button
                type="button"
                onClick={() => search.variables && search.mutate(search.variables)}
                className="ml-2 inline-flex items-center gap-1 font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}
          {search.data.status === "no_hard_match" ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <BrainCircuit className="mx-auto size-6 text-slate-500" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-slate-950">No verified hard match</h2>
              <p className="mt-1 text-sm text-slate-600">
                No product could be verified to meet all hard requirements. Revise the query rather than silently relaxing them.
              </p>
            </div>
          ) : null}
          {search.data.status !== "no_hard_match" && search.data.results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
              No deterministic candidates matched. Try a broader description.
            </p>
          ) : null}
          {search.data.results.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {search.data.results.map((result) => (
                <article key={result.product.id} className="space-y-3">
                  <ProductCard product={result.product} />
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm">
                    <p className="font-medium text-indigo-950">Score {result.score.toFixed(3)}</p>
                    {result.reason ? <p className="mt-2 text-slate-700">{result.reason}</p> : null}
                    {result.tradeoffs.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                        {result.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}
                      </ul>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-slate-400">Request ID: {search.data.requestId}</p>
        </div>
      ) : null}
    </section>
  );
}

function IntentChips({ intent }: { readonly intent: SearchIntentContract }) {
  const chips = [
    intent.category && `Category: ${intent.category}`,
    intent.price?.min !== undefined && `Min $${intent.price.min}`,
    intent.price?.max !== undefined && `Max $${intent.price.max}`,
    ...(intent.brands ?? []).map((value) => `Brand: ${value}`),
    intent.minRating !== undefined && `Rating ${intent.minRating}+`,
    ...intent.useCases.map((value) => `Use: ${value}`),
    ...intent.requiredFeatures.map((value) => `Required: ${value}`),
    ...intent.priorities.map((value) => `Priority: ${value}`),
    ...intent.negativePreferences.map((value) => `Avoid: ${value}`),
  ].filter((value): value is string => typeof value === "string");

  return chips.length > 0 ? (
    <div aria-label="Validated search intent" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-900">
          {chip}
        </span>
      ))}
    </div>
  ) : null;
}
