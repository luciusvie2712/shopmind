"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "./auth-provider";

export function ProtectedRoute({
  children,
  loadingFallback,
}: {
  readonly children: ReactNode;
  readonly loadingFallback?: ReactNode;
}) {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user === null) router.replace("/login");
  }, [ready, router, user]);

  if (!ready) {
    return loadingFallback ?? <div className="skeleton-block h-48" />;
  }
  if (user === null) {
    return (
      <section className="surface-card p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-950">
          Sign in required
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          This page contains private shopping data.
        </p>
        <Link
          href="/login"
          className="btn-primary mt-5"
        >
          Go to login
        </Link>
      </section>
    );
  }
  return children;
}
