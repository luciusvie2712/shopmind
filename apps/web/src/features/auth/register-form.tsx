"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ApiClientError, registerUser } from "@/lib/api/client";
import { registerFormSchema, type RegisterFormValues } from "./auth.schemas";

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>();
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);
  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    const parsed = registerFormSchema.safeParse(values);
    if (!parsed.success) {
      let firstInvalidField: "name" | "email" | "password" | undefined;
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "name" || field === "email" || field === "password") {
          firstInvalidField ??= field;
          setError(field, { message: issue.message });
        }
      }
      if (firstInvalidField) setFocus(firstInvalidField);
      return;
    }
    try {
      await registerUser(parsed.data);
      router.replace("/login");
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Unable to register",
      );
    }
  });
  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
    >
      <Field htmlFor="register-name" errorId="register-name-error" label="Name" error={errors.name?.message}>
        <input
          id="register-name"
          autoComplete="name"
          {...register("name")}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name ? "register-name-error" : undefined}
          className="form-input"
        />
      </Field>
      <Field htmlFor="register-email" errorId="register-email-error" label="Email" error={errors.email?.message}>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          className="form-input"
        />
      </Field>
      <Field htmlFor="register-password" errorId="register-password-error" label="Password" error={errors.password?.message}>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password ? "register-password-error" : undefined}
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
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-slate-950">
          Sign in
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
