"use client";

import type { ProductSummaryContract } from "@shopmind/contracts";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, LoaderCircle, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProductCard } from "@/features/products/product-card";
import { ApiClientError, sendAssistantMessage } from "@/lib/api/client";

export const assistantMessageSchema = z.object({
  message: z.string().trim().min(1, "Enter a message").max(2_000),
});

type FormValues = z.infer<typeof assistantMessageSchema>;

interface DisplayMessage {
  readonly key: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly products: readonly ProductSummaryContract[];
}

export function AssistantChat() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<readonly DisplayMessage[]>([]);
  const form = useForm<FormValues>({ defaultValues: { message: "" } });
  const assistant = useMutation({
    mutationFn: sendAssistantMessage,
    onSuccess: (turn) => {
      setConversationId(turn.conversationId);
      setMessages((current) => [
        ...current,
        {
          key: turn.message.id,
          role: "assistant",
          content: turn.message.content,
          products: turn.products,
        },
      ]);
    },
  });

  function submit(values: FormValues): void {
    const parsed = assistantMessageSchema.safeParse(values);
    if (!parsed.success) {
      form.setError(
        "message",
        { message: parsed.error.issues[0]?.message },
        { shouldFocus: true },
      );
      return;
    }
    setMessages((current) => [
      ...current,
      {
        key: `user-${Date.now()}`,
        role: "user",
        content: parsed.data.message,
        products: [],
      },
    ]);
    assistant.mutate({ conversationId, message: parsed.data.message });
    form.reset();
  }

  const errorMessage =
    assistant.error instanceof ApiClientError &&
    assistant.error.code === "AI_PROVIDER_TIMEOUT"
      ? "The assistant timed out. Your message was retained; you can retry."
      : assistant.error instanceof ApiClientError &&
          assistant.error.code === "AI_INVALID_OUTPUT"
        ? "The assistant returned an unsafe or invalid response. Nothing was fabricated."
        : assistant.error instanceof ApiClientError &&
            assistant.error.code === "API_UNAVAILABLE"
          ? "The ShopMind API is unavailable."
          : "The assistant could not complete this turn.";

  return (
    <section className="space-y-6">
      <div className="min-h-80 space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        {messages.length === 0 ? (
          <div className="grid min-h-64 place-items-center text-center">
            <div>
              <h2 className="font-semibold text-slate-950">Start a guided discovery</h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                Ask about products, categories, comparisons, preferences, or your wishlist. Tools are read-only.
              </p>
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <article key={message.key} className={`${message.role === "user" ? "ml-auto max-w-2xl" : "mr-auto max-w-4xl"} min-w-0`}>
            <div className={message.role === "user" ? "rounded-2xl bg-slate-950 p-4 text-white" : "rounded-2xl bg-indigo-50 p-4 text-slate-800"}>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
            </div>
            {message.products.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {message.products.map((product) => (
                  <ProductCard key={product.id} product={product} showActions={false} />
                ))}
              </div>
            ) : null}
          </article>
        ))}
        {assistant.isPending ? (
          <p role="status" className="flex items-center gap-2 text-sm text-indigo-700">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Assistant is using bounded read-only tools…
          </p>
        ) : null}
        {assistant.isError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="flex items-center gap-2"><AlertTriangle className="size-4" aria-hidden="true" /> {errorMessage}</p>
            <button
              type="button"
              disabled={assistant.variables === undefined}
              onClick={() => assistant.variables && assistant.mutate(assistant.variables)}
              className="mt-3 inline-flex items-center gap-2 font-semibold"
            >
              <RefreshCw className="size-4" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : null}
      </div>

      <form onSubmit={form.handleSubmit(submit)} className="rounded-2xl border border-slate-200 bg-white p-4">
        <label htmlFor="assistant-message" className="sr-only">Message</label>
        <textarea
          id="assistant-message"
          {...form.register("message")}
          aria-invalid={form.formState.errors.message !== undefined}
          aria-describedby={form.formState.errors.message ? "assistant-message-error" : undefined}
          rows={3}
          maxLength={2_000}
          placeholder="Show me lightweight laptops and compare the best options"
          className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">No checkout, payment, cart, or wishlist writes are available to AI.</p>
          <button
            type="submit"
            disabled={assistant.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden="true" /> Send
          </button>
        </div>
        {form.formState.errors.message ? (
          <p id="assistant-message-error" role="alert" className="mt-2 text-sm text-red-700">{form.formState.errors.message.message}</p>
        ) : null}
      </form>
    </section>
  );
}
