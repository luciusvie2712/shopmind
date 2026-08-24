"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid email address");

export function NewsletterForm() {
  const [message, setMessage] = useState<string>();

  function submit(formData: FormData): void {
    const parsed = emailSchema.safeParse(formData.get("email"));
    setMessage(
      parsed.success
        ? "Newsletter signup is not connected yet."
        : parsed.error.issues[0]?.message,
    );
  }

  return (
    <form action={submit} className="mt-4">
      <label htmlFor="newsletter-email" className="sr-only">
        Newsletter subscription address
      </label>
      <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          aria-label="Check newsletter availability"
          className="grid size-8 place-items-center rounded-lg text-slate-700 transition hover:bg-teal-50 hover:text-teal-700"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      {message ? (
        <p role="status" className="mt-2 text-xs text-slate-500">
          {message}
        </p>
      ) : null}
    </form>
  );
}
