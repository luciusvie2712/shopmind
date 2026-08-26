"use client";

import { CircleAlert, LoaderCircle, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ApiClientError, registerUser } from "@/lib/api/client";
import { AuthField } from "./auth-field";
import { registerFormSchema, type RegisterFormValues } from "./auth.schemas";
import { PasswordField } from "./password-field";

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
  const formErrorRef = useRef<HTMLDivElement>(null);

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
      noValidate
      onSubmit={submit}
      aria-busy={isSubmitting}
      className="space-y-5"
    >
      <AuthField
        htmlFor="register-name"
        errorId="register-name-error"
        label="Name"
        error={errors.name?.message}
        icon={UserRound}
      >
        <input
          id="register-name"
          autoComplete="name"
          disabled={isSubmitting}
          {...register("name")}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name ? "register-name-error" : undefined}
          className="form-input mt-0 h-12 pl-10 aria-invalid:border-red-500 aria-invalid:ring-4 aria-invalid:ring-red-100"
        />
      </AuthField>

      <AuthField
        htmlFor="register-email"
        errorId="register-email-error"
        label="Email"
        error={errors.email?.message}
        icon={Mail}
      >
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          {...register("email")}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          className="form-input mt-0 h-12 pl-10 aria-invalid:border-red-500 aria-invalid:ring-4 aria-invalid:ring-red-100"
        />
      </AuthField>

      <PasswordField
        id="register-password"
        autoComplete="new-password"
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
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </button>
    </form>
  );
}
