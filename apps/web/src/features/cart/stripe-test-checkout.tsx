"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPaymentIntent } from "@/lib/api/client";

interface StripeElements { create(type: "payment"): { mount(target: HTMLElement): void; destroy(): void } }
interface StripeClient { elements(options: { clientSecret: string }): StripeElements; confirmPayment(options: { elements: StripeElements; clientSecret: string; confirmParams: { return_url: string }; redirect: "if_required" }): Promise<{ error?: { message?: string } }> }
declare global { interface Window { Stripe?: (key: string) => StripeClient } }

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function StripeTestCheckout() {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<StripeClient | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const clientSecretRef = useRef<string | null>(null);
  const [stage, setStage] = useState<"idle" | "loading" | "ready" | "confirming">("idle");
  const [error, setError] = useState<string>();
  if (!publishableKey?.startsWith("pk_test_")) return null;
  const stripePublishableKey = publishableKey;

  async function prepare() {
    setStage("loading"); setError(undefined);
    try {
      const payment = await createPaymentIntent(crypto.randomUUID());
      if (!payment.clientSecret) throw new Error('Missing Stripe client secret');
      await loadStripeScript();
      const stripe = window.Stripe?.(stripePublishableKey);
      if (!stripe || !mountRef.current) throw new Error('Stripe.js is unavailable');
      const elements = stripe.elements({ clientSecret: payment.clientSecret });
      elements.create("payment").mount(mountRef.current);
      stripeRef.current = stripe; elementsRef.current = elements; clientSecretRef.current = payment.clientSecret;
      setStage("ready");
    } catch { setError("Stripe test checkout could not start. Your server-authoritative order state is preserved."); setStage("idle"); }
  }
  async function confirm() {
    if (!stripeRef.current || !elementsRef.current || !clientSecretRef.current) return;
    setStage("confirming"); setError(undefined);
    const result = await stripeRef.current.confirmPayment({ elements: elementsRef.current, clientSecret: clientSecretRef.current, confirmParams: { return_url: `${location.origin}/orders` }, redirect: "if_required" });
    if (result.error) { setError(result.error.message ?? "Test payment failed."); setStage("ready"); return; }
    router.push("/orders");
  }
  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Stripe test mode</p>
      <div ref={mountRef} className={stage === "ready" || stage === "confirming" ? "mt-4" : "hidden"} />
      {stage === "idle" || stage === "loading" ? <button type="button" onClick={() => void prepare()} disabled={stage === "loading"} className="btn-ai mt-3 w-full">{stage === "loading" ? "Preparing test payment…" : "Pay with Stripe test mode"}</button> : <button type="button" onClick={() => void confirm()} disabled={stage === "confirming"} className="btn-ai mt-4 w-full">{stage === "confirming" ? "Confirming…" : "Confirm test payment"}</button>}
      {error ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}
      <p className="mt-3 text-xs text-slate-500">Test keys only. Payment status becomes authoritative after a verified Stripe webhook.</p>
    </div>
  );
}

let stripeScript: Promise<void> | undefined;
function loadStripeScript(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  stripeScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://js.stripe.com/v3"; script.async = true;
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Stripe.js failed to load')); document.head.appendChild(script);
  });
  return stripeScript;
}
