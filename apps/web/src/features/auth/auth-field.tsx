import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AuthField({
  children,
  error,
  errorId,
  htmlFor,
  icon: Icon,
  label,
}: Readonly<{
  children: ReactNode;
  error?: string;
  errorId: string;
  htmlFor: string;
  icon: LucideIcon;
  label: string;
}>) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
        />
        {children}
      </div>
      {error ? (
        <span
          id={errorId}
          className="mt-1.5 block text-xs font-medium text-red-700"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
