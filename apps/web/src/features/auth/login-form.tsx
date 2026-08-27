"use client";

import { CircleAlert, LoaderCircle, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { getErrorFeedback } from "@/lib/feedback";
import { ApiClientError } from "@/lib/api/client";
import { AuthField } from "./auth-field";
import { useAuth } from "./auth-provider";
import { loginFormSchema, type LoginFormValues } from "./auth.schemas";
import { PasswordField } from "./password-field";

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
  const formErrorRef = useRef<HTMLDivElement>(null);

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
        error instanceof ApiClientError && error.code === "AUTH_REQUIRED"
          ? "Check your email and password, then try again."
          : `${getErrorFeedback(error).title}. ${getErrorFeedback(error).description}`,
      );
    }
  });

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-busy={isSubmitting}
      className="space-y-5"
    >
      <AuthField
        htmlFor="login-email"
        errorId="login-email-error"
        label="Email"
        error={errors.email?.message}
        icon={Mail}
      >
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          {...register("email")}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className="form-input mt-0 h-12 pl-10 aria-invalid:border-red-500 aria-invalid:ring-4 aria-invalid:ring-red-100"
        />
      </AuthField>

      <PasswordField
        id="login-password"
        autoComplete="current-password"
        disabled={isSubmitting}
        registration={register("password")}
        error={errors.password?.message}
      />

      {formError ? (
        <div
          ref={formErrorRef}
          role="alert"
          tabIndex={-1}
          className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <CircleAlert
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{formError}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="btn-primary min-h-12 w-full active:scale-[0.98]"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
