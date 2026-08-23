"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "./auth-provider";
import { loginFormSchema, type LoginFormValues } from "./auth.schemas";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    const parsed = loginFormSchema.safeParse(values);
    if (!parsed.success) {
      let firstInvalidField: "email" | "password" | undefined;
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" || field === "password") {
          firstInvalidField ??= field;
          setError(field, { message: issue.message });
        }
      }
      if (firstInvalidField) setFocus(firstInvalidField);
      return;
    }
    try {
      await login(parsed.data);
      router.replace("/products");
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Unable to sign in",
      );
    }
  });

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
    >
      <Field htmlFor="login-email" errorId="login-email-error" label="Email" error={errors.email?.message}>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className="form-input"
        />
      </Field>
      <Field htmlFor="login-password" errorId="login-password-error" label="Password" error={errors.password?.message}>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          className="form-input"
        />
      </Field>
      {formError ? (
        <p ref={formErrorRef} role="alert" tabIndex={-1} className="text-sm text-red-700 outline-none">
          {formError}
        </p>
      ) : null}
      <button
        disabled={isSubmitting}
        className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-sm text-slate-600">
        New to ShopMind?{" "}
        <Link href="/register" className="font-medium text-slate-950">
          Create an account
        </Link>
      </p>
    </form>
  );
}

function Field({
  htmlFor,
  errorId,
  label,
  error,
  children,
}: {
  readonly htmlFor: string;
  readonly errorId: string;
  readonly label: string;
  readonly error?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error ? (
        <span id={errorId} className="mt-1 block text-xs text-red-700">{error}</span>
      ) : null}
    </div>
  );
}
