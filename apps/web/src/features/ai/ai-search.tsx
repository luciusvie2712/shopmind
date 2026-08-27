"use client";

import type {
  AiSearchContract,
  SearchIntentContract,
} from "@shopmind/contracts";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  GitCompareArrows,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Reveal } from "@/components/ui/reveal";
import { aiSearch, ApiClientError } from "@/lib/api/client";
import { AiRecommendationCard } from "./ai-recommendation-card";
import { AiSearchInsight } from "./ai-search-insight";
import { FeedbackAlert } from "@/components/feedback/feedback-alert";
import { getErrorFeedback } from "@/lib/feedback";

export const aiSearchFormSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Describe your need in at least 3 characters")
    .max(500),
});

type AiSearchFormValues = z.infer<typeof aiSearchFormSchema>;

export function AiSearch({ initialQuery = "" }: { readonly initialQuery?: string }) {
  const parsedInitialQuery = aiSearchFormSchema.shape.query.safeParse(initialQuery);
  const [selectedProductIds, setSelectedProductIds] = useState<readonly string[]>([]);
  const form = useForm<AiSearchFormValues>({
    defaultValues: {
      query: parsedInitialQuery.success ? parsedInitialQuery.data : "",
    },
  });
  const searchMutation = useMutation({
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
    setSelectedProductIds([]);
    searchMutation.mutate(parsed.data);
  }

  function retry(): void {
    if (searchMutation.variables) searchMutation.mutate(searchMutation.variables);
  }

  function toggleCompare(productId: string): void {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : current.length < 4
          ? [...current, productId]
          : current,
    );
  }

  const submittedQuery = searchMutation.variables?.query ?? "";

  return (
    <section aria-label="AI product discovery">
      <SearchWorkspace
        form={form}
        pending={searchMutation.isPending}
        intent={searchMutation.isSuccess ? searchMutation.data.intent : undefined}
        onSubmit={submit}
      />

      <div aria-live="polite" aria-busy={searchMutation.isPending}>
        {searchMutation.isPending ? <AiSearchPending /> : null}
        {searchMutation.isError ? (
          <AiSearchError
            error={searchMutation.error}
            canRetry={searchMutation.variables !== undefined}
            onRetry={retry}
          />
        ) : null}
        {searchMutation.isSuccess ? (
          <AiSearchResults
            data={searchMutation.data}
            query={submittedQuery}
            selectedProductIds={selectedProductIds}
            onCompareToggle={toggleCompare}
            onRetry={retry}
            onRefine={() => {
              form.setFocus("query");
              document.getElementById("ai-search-workspace")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

function SearchWorkspace({
  form,
  pending,
  intent,
  onSubmit,
}: {
  readonly form: ReturnType<typeof useForm<AiSearchFormValues>>;
  readonly pending: boolean;
  readonly intent?: SearchIntentContract;
  readonly onSubmit: (values: AiSearchFormValues) => void;
}) {
  const formError = form.formState.errors.query;
  const showIntent = intent !== undefined && hasIntentValues(intent);
  return (
    <div
      id="ai-search-workspace"
      className="surface-panel overflow-hidden bg-gradient-to-br from-indigo-50/90 via-blue-50/65 to-teal-50/70 p-5 sm:p-7 lg:p-9"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} aria-busy={pending}>
        <label htmlFor="ai-query" className="text-base font-extrabold text-slate-950 sm:text-lg">
          What are you shopping for?
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="ai-query"
              {...form.register("query")}
              aria-invalid={formError !== undefined}
              aria-describedby={formError ? "ai-query-error" : "ai-query-help"}
              maxLength={500}
              placeholder="A lightweight laptop under $1200 for backend development and Docker"
              className="form-input-ai h-12 pl-11 pr-4 shadow-sm sm:h-13"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="btn-ai h-12 min-w-44 px-5 active:scale-[0.98] sm:h-13"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4" aria-hidden="true" />
            )}
            <span>{pending ? "Interpreting" : "Discover products"}</span>
          </button>
        </div>
        <p id="ai-query-help" className="mt-3 text-xs text-slate-500">
          AI remains read-only and uses canonical ShopMind products.
        </p>
        {formError ? (
          <p id="ai-query-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
            {formError.message}
          </p>
        ) : null}
      </form>

      {showIntent ? (
        <div className="mt-6 border-t border-indigo-100 pt-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
            <Sparkles className="size-4 text-indigo-600" aria-hidden="true" />
            AI interpreted your intent
          </h2>
          <IntentChips intent={intent} />
        </div>
      ) : null}
    </div>
  );
}

function AiSearchPending() {
  return (
    <section aria-label="AI search pending" className="mt-8 grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="surface-card space-y-4 p-5">
        <div className="skeleton-block h-5 w-28" />
        <div className="skeleton-block h-16 w-full" />
        <div className="skeleton-block h-28 w-full" />
        <div className="skeleton-block h-40 w-full" />
      </div>
      <div>
        <div className="skeleton-block h-7 w-56" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="surface-card grid gap-4 p-4 sm:grid-cols-[28px_128px_1fr]">
              <div className="skeleton-block size-7 rounded-full" />
              <div className="skeleton-block h-28 w-full" />
              <div className="space-y-3 py-2">
                <div className="skeleton-block h-5 w-2/3" />
                <div className="skeleton-block h-4 w-1/2" />
                <div className="skeleton-block h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiSearchError({
  error,
  canRetry,
  onRetry,
}: {
  readonly error: Error;
  readonly canRetry: boolean;
  readonly onRetry: () => void;
}) {
  const apiError = error instanceof ApiClientError ? error : null;
  const content =
    apiError?.code === "AI_PROVIDER_TIMEOUT"
      ? { title: "AI search took too long", message: "Gemini timed out before a safe fallback could be produced." }
      : apiError?.code === "AI_INVALID_OUTPUT"
        ? { title: "AI response could not be validated", message: "Gemini returned an invalid response and no safe fallback was available." }
        : apiError?.code === "API_UNAVAILABLE"
          ? { title: "ShopMind is temporarily unavailable", message: "The ShopMind API is unavailable. Your query is still ready to retry." }
          : { title: getErrorFeedback(error).title, message: getErrorFeedback(error).description };

  return (
    <FeedbackAlert variant={getErrorFeedback(error).variant} title={content.title} description={content.message} className="mt-8" action={
      <button type="button" disabled={!canRetry} onClick={onRetry} className="btn-secondary mt-4 border-red-200 text-red-800 sm:mt-0">
        <RefreshCw className="size-4" aria-hidden="true" /> Retry
      </button>
    } />
  );
}

function AiSearchResults({
  data,
  query,
  selectedProductIds,
  onCompareToggle,
  onRetry,
  onRefine,
}: {
  readonly data: AiSearchContract;
  readonly query: string;
  readonly selectedProductIds: readonly string[];
  readonly onCompareToggle: (productId: string) => void;
  readonly onRetry: () => void;
  readonly onRefine: () => void;
}) {
  const selectedProducts = data.results
    .map(({ product }) => product)
    .filter(({ id }) => selectedProductIds.includes(id));

  return (
    <div className="mt-8 space-y-8">
      {data.status === "fallback" ? (
        <FeedbackAlert variant="warning" role="status" title="Showing deterministic results" description={`AI ${data.fallback?.stage ?? "search"} was unavailable or invalid. These are deterministic canonical results without fabricated explanations.`} action={
          <button type="button" onClick={onRetry} className="btn-secondary"><RefreshCw className="size-4" aria-hidden="true" /> Retry</button>
        } />
      ) : null}
      {selectedProductIds.length === 4 ? (
        <FeedbackAlert variant="warning" role="status" title="Comparison limit reached" description="You can compare up to 4 products. Remove one to select another." />
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Reveal direction="left">
          <AiSearchInsight intent={data.intent} query={query} />
        </Reveal>
        <section aria-labelledby="ai-recommendations-title" className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="ai-recommendations-title" className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Top AI recommendations
              </h2>
              <p className="mt-1 text-sm text-slate-600">Grounded matches ranked for your validated request.</p>
            </div>
            {data.results.length > 0 ? (
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                <GitCompareArrows className="size-4 text-indigo-600" aria-hidden="true" />
                Select 2–4 to compare ({selectedProductIds.length}/4)
              </p>
            ) : null}
          </div>

          {data.status === "no_hard_match" ? (
            <div className="state-card mt-5">
              <BrainCircuit className="mx-auto size-7 text-slate-500" aria-hidden="true" />
              <h3 className="mt-3 font-extrabold text-slate-950">No verified hard match</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                No product could be verified to meet every hard requirement. Revise the query rather than silently relaxing it.
              </p>
              <button type="button" onClick={onRefine} className="btn-secondary mt-5">Edit search</button>
            </div>
          ) : data.results.length === 0 ? (
            <div className="state-card mt-5">
              <Search className="mx-auto size-7 text-slate-500" aria-hidden="true" />
              <h3 className="mt-3 font-extrabold text-slate-950">No matching products</h3>
              <p className="mt-2 text-sm text-slate-600">No deterministic candidates matched this request.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={onRefine} className="btn-secondary">Edit search</button>
                <Link href="/products" className="btn-primary">Browse products</Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {data.results.map((result, index) => (
                <Reveal key={result.product.id} delay={Math.min(index * 50, 200)}>
                  <AiRecommendationCard
                    result={result}
                    rank={index + 1}
                    selected={selectedProductIds.includes(result.product.id)}
                    compareDisabled={selectedProductIds.length >= 4 && !selectedProductIds.includes(result.product.id)}
                    onCompareToggle={() => onCompareToggle(result.product.id)}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </div>

      {data.results.length > 0 ? (
        <Reveal>
          <section className="surface-panel grid gap-5 bg-gradient-to-r from-indigo-50/65 to-teal-50/60 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-950">Refine your search</h2>
              <p className="mt-1 text-sm text-slate-600">Edit your original request and run the same grounded AI search again.</p>
            </div>
            <button type="button" onClick={onRefine} className="btn-secondary">
              Edit query <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </section>
        </Reveal>
      ) : null}

      {selectedProducts.length >= 2 ? (
        <Reveal>
          <section aria-labelledby="compare-top-picks-title" className="surface-panel overflow-hidden">
            <div className="border-b border-slate-200 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <h2 id="compare-top-picks-title" className="text-lg font-extrabold text-slate-950">Compare top picks</h2>
                <p className="mt-1 text-sm text-slate-600">Review canonical facts for the products you selected.</p>
              </div>
              <Link href={`/compare?ids=${selectedProductIds.join(",")}`} className="btn-ai mt-4 sm:mt-0">
                Compare selected <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {selectedProducts.map((product, index) => (
                <article key={product.id} className="min-w-0 p-5">
                  <p className="text-xs font-extrabold text-teal-700">Pick {index + 1}</p>
                  <h3 className="mt-2 line-clamp-2 font-bold text-slate-950">{product.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{product.brand ?? product.category.name}</p>
                  <p className="mt-3 text-sm font-extrabold text-slate-950">${product.price.toFixed(2)}</p>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      <p className="text-xs text-slate-400">Request ID: {data.requestId}</p>
    </div>
  );
}

type IntentChip = {
  readonly key: string;
  readonly label: string;
  readonly tone: string;
};

function IntentChips({ intent }: { readonly intent: SearchIntentContract }) {
  const chips: IntentChip[] = [
    ...(intent.category
      ? [{ key: `category-${intent.category}`, label: intent.category, tone: "border-blue-200 bg-blue-100/80 text-blue-800" }]
      : []),
    ...(intent.price?.min !== undefined
      ? [{ key: "price-min", label: `From $${intent.price.min}`, tone: "border-teal-200 bg-teal-100/80 text-teal-800" }]
      : []),
    ...(intent.price?.max !== undefined
      ? [{ key: "price-max", label: `Under $${intent.price.max}`, tone: "border-teal-200 bg-teal-100/80 text-teal-800" }]
      : []),
    ...(intent.brands ?? []).map((value, index) => ({ key: `brand-${index}-${value}`, label: value, tone: "border-blue-200 bg-blue-100/80 text-blue-800" })),
    ...(intent.minRating !== undefined
      ? [{ key: "rating", label: `${intent.minRating}+ rating`, tone: "border-indigo-200 bg-indigo-100/80 text-indigo-800" }]
      : []),
    ...intent.useCases.map((value, index) => ({ key: `use-${index}-${value}`, label: value, tone: "border-emerald-200 bg-emerald-100/80 text-emerald-800" })),
    ...intent.requiredFeatures.map((value, index) => ({ key: `required-${index}-${value}`, label: value, tone: "border-blue-200 bg-blue-100/80 text-blue-800" })),
    ...intent.priorities.map((value, index) => ({ key: `priority-${index}-${value}`, label: value, tone: "border-indigo-200 bg-indigo-100/80 text-indigo-800" })),
    ...intent.negativePreferences.map((value, index) => ({ key: `avoid-${index}-${value}`, label: `Avoid ${value}`, tone: "border-orange-200 bg-orange-100/80 text-orange-800" })),
  ];

  return chips.length > 0 ? (
    <div aria-label="Validated search intent" className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
      {chips.map((chip, index) => (
        <span
          key={chip.key}
          className={`hero-enter inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-bold ${chip.tone}`}
          style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  ) : null;
}

function hasIntentValues(intent: SearchIntentContract): boolean {
  return Boolean(
    intent.category ||
      intent.price?.min !== undefined ||
      intent.price?.max !== undefined ||
      (intent.brands?.length ?? 0) > 0 ||
      intent.minRating !== undefined ||
      intent.useCases.length > 0 ||
      intent.requiredFeatures.length > 0 ||
      intent.priorities.length > 0 ||
      intent.negativePreferences.length > 0,
  );
}
