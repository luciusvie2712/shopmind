"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { hashTelemetryQuery, trackEvent } from "@/lib/telemetry";

export function ProductTelemetryLink({
  productId,
  href,
  className,
  children,
}: {
  readonly productId: string;
  readonly href: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const searchParams = useSearchParams();

  function trackClick(): void {
    const query = searchParams.get("q")?.trim();
    if (!query) return;
    void hashTelemetryQuery(query).then((queryHash) => {
      trackEvent({
        type: "SEARCH_RESULT_CLICK",
        productId,
        correlationId: queryHash.slice(0, 32),
        metadata: { surface: "catalog_search", queryHash },
      });
    }).catch(() => undefined);
  }

  return (
    <Link href={href} className={className} onClick={trackClick}>
      {children}
    </Link>
  );
}
