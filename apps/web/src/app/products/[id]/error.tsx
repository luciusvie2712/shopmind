"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ProductDetailError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell">
      <div role="alert" className="state-card">
        <AlertTriangle className="mx-auto size-7 text-red-700" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-extrabold text-slate-950">Unable to load product details</h1>
        <p className="mt-2 text-sm text-slate-600">The product service is temporarily unavailable.</p>
        <button type="button" onClick={reset} className="btn-primary mt-5">
          <RefreshCw className="size-4" aria-hidden="true" /> Try again
        </button>
      </div>
    </main>
  );
}
