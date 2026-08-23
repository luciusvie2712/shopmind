"use client";

import { AssistantChat } from "@/features/ai/assistant-chat";
import { ProtectedRoute } from "@/features/auth/protected-route";

export default function AssistantPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <ProtectedRoute>
        <p className="text-sm font-medium text-indigo-700">Read-only guidance</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          ShopMind assistant
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          The assistant can inspect bounded canonical catalog facts and your wishlist, but cannot perform commerce writes.
        </p>
        <div className="mt-8"><AssistantChat /></div>
      </ProtectedRoute>
    </main>
  );
}
