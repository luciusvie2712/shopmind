"use client";

import type { ProductSummaryContract } from "@shopmind/contracts";
import { useMutation } from "@tanstack/react-query";
import {
  Bot,
  LoaderCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AssistantContextPanel } from "./assistant-context-panel";
import { AssistantGroundedResults } from "./assistant-grounded-results";
import { ApiClientError, sendAssistantMessage } from "@/lib/api/client";
import { FeedbackAlert } from "@/components/feedback/feedback-alert";

export const assistantMessageSchema = z.object({
  message: z.string().trim().min(1, "Enter a message").max(2_000),
});

type FormValues = z.infer<typeof assistantMessageSchema>;

interface DisplayMessage {
  readonly key: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt?: string;
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function AssistantChat() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<readonly DisplayMessage[]>([]);
  const [groundedProducts, setGroundedProducts] = useState<readonly ProductSummaryContract[]>([]);
  const form = useForm<FormValues>({ defaultValues: { message: "" } });
  const assistant = useMutation({
    mutationFn: sendAssistantMessage,
    onSuccess: (turn) => {
      setConversationId(turn.conversationId);
      setGroundedProducts(turn.products);
      setMessages((current) => [
        ...current,
        {
          key: turn.message.id,
          role: "assistant",
          content: turn.message.content,
          createdAt: turn.message.createdAt,
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
        key: `local-user-${crypto.randomUUID()}`,
        role: "user",
        content: parsed.data.message,
      },
    ]);
    assistant.mutate({ conversationId, message: parsed.data.message });
    form.reset();
  }

  const apiError = assistant.error instanceof ApiClientError ? assistant.error : undefined;
  const errorMessage = getAssistantErrorMessage(apiError);

  return (
    <section
      aria-label="AI shopping assistant workspace"
      className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(260px,310px)]"
    >
      <div className="order-2 min-w-0 md:order-2 xl:order-1">
        <AssistantContextPanel />
      </div>

      <section
        aria-labelledby="conversation-title"
        className="surface-card order-1 flex min-w-0 flex-col overflow-hidden md:order-1 md:col-span-2 xl:order-2 xl:col-span-1 xl:h-[calc(100vh-8rem)] xl:min-h-[42rem] xl:max-h-[54rem]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 to-teal-100 text-indigo-700">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="conversation-title" className="font-bold text-slate-950">Conversation</h2>
              <p className="truncate text-xs text-slate-500">Grounded, bounded product discovery</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-teal-700">
            <ShieldCheck className="size-4" aria-hidden="true" /> Read-only
          </span>
        </header>

        {assistant.isError ? (
          <FeedbackAlert variant="warning" title={errorMessage} className="m-4 mb-0 sm:mx-5" action={
              apiError?.code !== "FORBIDDEN" && apiError?.code !== "AUTH_REQUIRED" ? (
                <button
                  type="button"
                  disabled={assistant.variables === undefined || assistant.isPending}
                  onClick={() => assistant.variables && assistant.mutate(assistant.variables)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold transition hover:border-amber-400 disabled:opacity-60"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" /> Retry
                </button>
              ) : null
          } />
        ) : null}

        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={assistant.isPending}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-5"
        >
          {messages.length === 0 ? <EmptyConversation /> : null}
          {messages.map((message) => <ConversationMessage key={message.key} message={message} />)}
          {assistant.isPending ? (
            <div role="status" className="animate-in fade-in flex items-start gap-3 motion-reduce:animate-none">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-700">
                <Bot className="size-4" aria-hidden="true" />
              </span>
              <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <LoaderCircle className="size-4 animate-spin text-indigo-600 motion-reduce:animate-none" aria-hidden="true" />
                  Waiting for the assistant response…
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="border-t border-slate-200 bg-white p-4 sm:p-5">
          <label htmlFor="assistant-message" className="sr-only">Message</label>
          <div className="rounded-2xl border border-indigo-200 bg-white p-2 transition-[border-color,box-shadow] focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100/70">
            <textarea
              id="assistant-message"
              {...form.register("message")}
              aria-invalid={form.formState.errors.message !== undefined}
              aria-describedby={form.formState.errors.message ? "assistant-message-error" : "assistant-message-help"}
              rows={3}
              maxLength={2_000}
              placeholder="Show me lightweight laptops and compare the best options"
              className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-slate-950 outline-none"
            />
            <div className="mt-1 flex items-end justify-between gap-3 border-t border-slate-100 px-1 pt-2">
              <p id="assistant-message-help" className="max-w-md text-[11px] leading-4 text-slate-500">No checkout, payment, cart, or wishlist writes are available to AI.</p>
              <button type="submit" disabled={assistant.isPending} className="btn-ai size-11 shrink-0 px-0" aria-label="Send">
                {assistant.isPending ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {form.formState.errors.message ? (
            <p id="assistant-message-error" role="alert" className="mt-2 text-sm text-red-700">{form.formState.errors.message.message}</p>
          ) : null}
        </form>
      </section>

      <div className="order-3 min-w-0 md:order-3 xl:order-3">
        <AssistantGroundedResults products={groundedProducts} />
      </div>
    </section>
  );
}

function EmptyConversation() {
  return (
    <div className="grid min-h-72 place-items-center text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-teal-100 text-indigo-700">
          <Bot className="size-7" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-bold text-slate-950">Start a guided discovery</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">Ask about products, categories, comparisons, preferences, or your wishlist. Tools are read-only.</p>
      </div>
    </div>
  );
}

function ConversationMessage({ message }: { readonly message: DisplayMessage }) {
  const isUser = message.role === "user";
  return (
    <article className={`animate-in fade-in slide-in-from-bottom-2 flex items-start gap-3 duration-300 motion-reduce:animate-none ${isUser ? "ml-auto max-w-[95%] flex-row-reverse sm:max-w-[85%]" : "mr-auto max-w-[95%] sm:max-w-[88%]"}`}>
      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${isUser ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-indigo-700"}`}>
        {isUser ? <UserRound className="size-4" aria-hidden="true" /> : <Bot className="size-4" aria-hidden="true" />}
      </span>
      <div className={`min-w-0 rounded-2xl px-4 py-3 ${isUser ? "rounded-tr-md border border-blue-200 bg-blue-50 text-slate-800" : "rounded-tl-md border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
        {message.createdAt ? (
          <time dateTime={message.createdAt} className="mt-2 block text-right text-[10px] text-slate-400">{formatMessageTime(message.createdAt)}</time>
        ) : null}
      </div>
    </article>
  );
}

function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
}

function getAssistantErrorMessage(error: ApiClientError | undefined): string {
  switch (error?.code) {
    case "VALIDATION_ERROR":
      return "Check your message and try again.";
    case "AI_PROVIDER_TIMEOUT":
      return "The assistant timed out. Your conversation was retained; you can retry.";
    case "AI_INVALID_OUTPUT":
    case "INVALID_RESPONSE":
      return "The assistant returned an invalid response. Nothing was fabricated.";
    case "API_UNAVAILABLE":
      return "The ShopMind API is unavailable. Your conversation remains visible.";
    case "AUTH_REQUIRED":
      return "Your session is no longer authorized. Sign in again to continue.";
    case "FORBIDDEN":
      return "This conversation is not available to your account.";
    case "AI_RATE_LIMITED":
      return "The assistant request limit was reached. Please try again later.";
    default:
      return "The assistant could not complete this turn.";
  }
}
