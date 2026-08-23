"use client";

import { useMutation } from "@tanstack/react-query";
import { BrainCircuit, LoaderCircle, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, semanticSearch } from "@/lib/api/client";
import { ProductCard } from "./product-card";

const semanticFormSchema = z.object({
  query: z.string().trim().min(3).max(500),
  limit: z.number().int().min(1).max(20),
});

type SemanticFormValues = z.infer<typeof semanticFormSchema>;

interface SemanticSearchProps {
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
}

export function SemanticSearch({
  category,
  minPrice,
  maxPrice,
}: SemanticSearchProps) {
  const form = useForm<SemanticFormValues>({
    defaultValues: { query: "", limit: 8 },
  });
  const search = useMutation({ mutationFn: semanticSearch });

  function submit(values: SemanticFormValues): void {
    const parsed = semanticFormSchema.safeParse(values);
    if (!parsed.success) {
      let firstInvalidField: keyof SemanticFormValues | undefined;
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof SemanticFormValues;
        firstInvalidField ??= field;
        form.setError(field, { message: issue.message });
      });
      if (firstInvalidField) form.setFocus(firstInvalidField);
      return;
    }

    search.mutate({ ...parsed.data, category, minPrice, maxPrice });
  }

  const errorMessage =
    search.error instanceof ApiClientError &&
    search.error.code === "AI_PROVIDER_TIMEOUT"
      ? "Semantic search provider timed out or is unavailable."
      : "Semantic search is temporarily unavailable.";

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
        <BrainCircuit className="size-4" aria-hidden="true" />
        Semantic product search
      </div>
      <p className="mt-1 text-sm text-indigo-800">
        Describe what you need. Results are vector candidates using canonical
        ShopMind product facts.
      </p>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <label className="flex-1">
          <span className="sr-only">Semantic query</span>
          <input
            id="semantic-query"
            {...form.register("query")}
            aria-invalid={form.formState.errors.query !== undefined}
            aria-describedby={form.formState.errors.query ? "semantic-search-error" : undefined}
            maxLength={500}
            placeholder="Lightweight laptop for Docker development"
            className="h-11 w-full rounded-lg border border-indigo-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <input
          id="semantic-limit"
          {...form.register("limit", { valueAsNumber: true })}
          type="number"
          min={1}
          max={20}
          aria-label="Result limit"
          aria-invalid={form.formState.errors.limit !== undefined}
          aria-describedby={form.formState.errors.limit ? "semantic-search-error" : undefined}
          className="h-11 w-24 rounded-lg border border-indigo-200 bg-white px-3 text-sm"
        />
        <button
          type="submit"
          disabled={search.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-60"
        >
          {search.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <BrainCircuit className="size-4" aria-hidden="true" />
          )}
          {search.isPending ? "Searching" : "Search semantically"}
        </button>
      </form>
      {form.formState.errors.query || form.formState.errors.limit ? (
        <p id="semantic-search-error" role="alert" className="mt-2 text-sm text-red-700">
          {form.formState.errors.query?.message ??
            form.formState.errors.limit?.message}
        </p>
      ) : null}

      {search.isPending ? (
        <div
          aria-label="Semantic search pending"
          className="mt-6 h-40 animate-pulse rounded-xl bg-indigo-100"
        />
      ) : null}
      {search.isError ? (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-white p-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
          <button
            type="button"
            disabled={search.variables === undefined}
            onClick={() => {
              if (search.variables !== undefined) search.mutate(search.variables);
            }}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-800"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : null}
      {search.isSuccess && search.data.items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-indigo-300 bg-white p-6 text-center text-sm text-slate-600">
          No semantic candidates matched this query and the active hard filters.
        </p>
      ) : null}
      {search.isSuccess && search.data.items.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-4 font-semibold text-slate-950">
            Semantic candidates
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {search.data.items.map((candidate) => (
              <div key={candidate.product.id}>
                <p className="mb-2 text-xs font-medium text-indigo-800">
                  Cosine similarity: {candidate.semanticSimilarity.toFixed(3)}
                </p>
                <ProductCard product={candidate.product} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
