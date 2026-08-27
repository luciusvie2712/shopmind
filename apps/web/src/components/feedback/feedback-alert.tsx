import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { FeedbackVariant } from "@/lib/feedback";

const styles = {
  success: "border-teal-200 bg-teal-50/60 text-teal-950 [&>svg]:text-teal-700",
  info: "border-blue-200 bg-blue-50/60 text-slate-950 [&>svg]:text-blue-700",
  warning: "border-amber-200 bg-amber-50/60 text-amber-950 [&>svg]:text-amber-700",
  error: "border-red-200 bg-red-50/60 text-red-950 [&>svg]:text-red-700",
};
const icons = { success: CircleCheck, info: Info, warning: TriangleAlert, error: CircleAlert };

export function FeedbackAlert({
  variant = "error", title, description, action, className = "", role,
}: {
  readonly variant?: FeedbackVariant;
  readonly title: string;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
  readonly role?: "alert" | "status";
}) {
  const Icon = icons[variant];
  return (
    <div
      role={role ?? (variant === "warning" || variant === "error" ? "alert" : "status")}
      className={`feedback-alert flex min-w-0 items-start gap-3 rounded-2xl border p-4 ${styles[variant]} ${className}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 break-words">
        <h2 className="text-sm font-bold">{title}</h2>
        {description ? <div className="mt-1 text-sm leading-6">{description}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
