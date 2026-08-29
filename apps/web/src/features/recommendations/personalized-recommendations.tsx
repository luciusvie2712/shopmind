"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ProductCard } from "@/features/products/product-card";
import { useAuth } from "@/features/auth/auth-provider";
import { getRecommendations } from "@/lib/api/client";
import { trackEvent, trackEventOnce } from "@/lib/telemetry";

export function PersonalizedRecommendations() {
  const { ready, user } = useAuth();
  const recommendations = useQuery({
    queryKey: ["recommendations", 8],
    queryFn: () => getRecommendations(8),
    enabled: ready && user !== null,
  });

  useEffect(() => {
    for (const item of recommendations.data?.items ?? []) {
      trackEventOnce(`recommendation:${item.rankingVersion}:${item.product.id}`, {
        type: "RECOMMENDATION_IMPRESSION",
        productId: item.product.id,
        metadata: { surface: "home_recommendations" },
      });
    }
  }, [recommendations.data]);

  if (!ready || user === null) return null;
  if (recommendations.isPending) {
    return <section className="page-shell py-10" aria-label="Loading recommendations"><div className="skeleton-block h-72" /></section>;
  }
  if (recommendations.isError || !recommendations.data) {
    return <section className="page-shell py-10"><div className="surface-card p-6"><h2 className="text-xl font-extrabold text-slate-950">Recommendations are taking a break</h2><p className="mt-2 text-sm text-slate-600">Your catalog and search experience remain fully available.</p></div></section>;
  }
  if (recommendations.data.items.length === 0) return null;

  return (
    <section className="page-shell py-10" aria-labelledby="recommendation-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="page-kicker">For you</p><h2 id="recommendation-title" className="mt-2 text-2xl font-extrabold text-slate-950">{recommendations.data.personalized ? "Inspired by your shopping" : "Popular picks to get started"}</h2></div>
        <p className="text-sm text-slate-500">Deterministic · canonical catalog</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {recommendations.data.items.map(({ product }) => (
          <div
            key={product.id}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a") !== null) {
                trackEvent({ type: "RECOMMENDATION_CLICK", productId: product.id, metadata: { surface: "home_recommendations" } });
              }
            }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
