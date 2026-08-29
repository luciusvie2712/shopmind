"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, ThumbsDown, ThumbsUp } from "lucide-react";
import { getReviewSummary } from "@/lib/api/client";

export function ReviewSummary({ productId }: { readonly productId: string }) {
  const summary = useQuery({
    queryKey: ["review-summary", productId],
    queryFn: () => getReviewSummary(productId),
    refetchInterval: (query) => query.state.data?.status === "pending" ? 2_000 : false,
  });
  if (summary.isPending) return <div className="mt-5 skeleton-block h-32" aria-label="Preparing review summary" />;
  if (summary.isError || !summary.data || summary.data.status === "failed") {
    return <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">AI review summary is unavailable. Canonical customer reviews remain below.</p>;
  }
  if (summary.data.status === "unavailable") return null;
  if (summary.data.status === "pending") return <p className="mt-5 rounded-xl bg-teal-50 p-4 text-sm font-semibold text-teal-800">Preparing a grounded summary from {summary.data.reviewCount} canonical reviews…</p>;
  return (
    <article className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/60 p-5" aria-label="AI review summary">
      <p className="inline-flex items-center gap-2 text-sm font-extrabold text-teal-900"><Bot className="size-4" aria-hidden="true" /> Review-derived AI summary</p>
      <p className="mt-1 text-xs text-teal-800">Grounded in {summary.data.reviewCount} canonical reviews. Sentiment is not a verified product specification.</p>
      {summary.data.themes.length > 0 ? <p className="mt-4 text-sm text-slate-700">{summary.data.themes.join(" · ")}</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SummaryList icon={ThumbsUp} title="Common positives" items={summary.data.positives} />
        <SummaryList icon={ThumbsDown} title="Common negatives" items={summary.data.negatives} />
      </div>
      {summary.data.caveats.length > 0 ? <p className="mt-4 text-xs text-slate-600">Caveats: {summary.data.caveats.join(" · ")}</p> : null}
    </article>
  );
}

function SummaryList({ icon: Icon, title, items }: { readonly icon: typeof ThumbsUp; readonly title: string; readonly items: readonly string[] }) {
  if (items.length === 0) return null;
  return <section><h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900"><Icon className="size-4" aria-hidden="true" />{title}</h3><ul className="mt-2 space-y-1 text-sm text-slate-600">{items.map((item) => <li key={item}>• {item}</li>)}</ul></section>;
}
