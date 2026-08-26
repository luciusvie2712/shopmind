"use client";

import { useEffect } from "react";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="page-shell">
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
      >
        <h1 className="text-xl font-semibold text-red-950">
          Unable to render the catalog
        </h1>
        <button
          onClick={reset}
          className="btn-danger mt-5"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
