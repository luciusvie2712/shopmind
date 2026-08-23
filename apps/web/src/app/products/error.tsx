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
    <main className="mx-auto max-w-7xl px-4 py-16">
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
      >
        <h1 className="text-xl font-semibold text-red-950">
          Unable to render the catalog
        </h1>
        <button
          onClick={reset}
          className="mt-5 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
