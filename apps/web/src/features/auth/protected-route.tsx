"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "./auth-provider";

export function ProtectedRoute({ children }: { readonly children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user === null) router.replace("/login");
  }, [ready, router, user]);

  if (!ready) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />;
  }
  if (user === null) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-950">
          Sign in required
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          This page contains private shopping data.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
        >
          Go to login
        </Link>
      </section>
    );
  }
  return children;
}
