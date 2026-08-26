"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { AuthField } from "./auth-field";

export function PasswordField({
  autoComplete,
  disabled,
  error,
  id,
  registration,
}: Readonly<{
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  error?: string;
  id: string;
  registration: UseFormRegisterReturn;
}>) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <AuthField
      htmlFor={id}
      errorId={errorId}
      label="Password"
      error={error}
      icon={LockKeyhole}
    >
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        disabled={disabled}
        {...registration}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        className="form-input mt-0 h-12 pl-10 pr-12 aria-invalid:border-red-500 aria-invalid:ring-4 aria-invalid:ring-red-100"
      />
      <button
        type="button"
        aria-label={visible ? "Hide entered value" : "Show entered value"}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </AuthField>
  );
}
