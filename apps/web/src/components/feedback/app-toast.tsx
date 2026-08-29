"use client";

import {
  CircleAlert,
  CircleCheck,
  GitCompareArrows,
  Heart,
  Info,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import type { FeedbackToastIcon, FeedbackVariant } from "@/lib/feedback";

const icons = {
  default: Info,
  cart: ShoppingCart,
  wishlist: Heart,
  compare: GitCompareArrows,
  checkout: CircleCheck,
  ai: Sparkles,
  network: Wifi,
  warning: TriangleAlert,
  error: CircleAlert,
} satisfies Record<FeedbackToastIcon, typeof Info>;

const tones: Record<
  FeedbackVariant,
  { readonly border: string; readonly circle: string }
> = {
  success: {
    border: "border-emerald-200/80",
    circle: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  info: {
    border: "border-blue-200/80",
    circle: "border-blue-200 bg-blue-50 text-blue-600",
  },
  warning: {
    border: "border-amber-200/90",
    circle: "border-amber-200 bg-amber-50 text-amber-600",
  },
  error: {
    border: "border-red-200/80",
    circle: "border-red-200 bg-red-50 text-red-600",
  },
  neutral: {
    border: "border-slate-200",
    circle: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export function AppToastCard({
  variant,
  icon = "default",
  title,
  description,
  action,
  onClose,
}: {
  readonly variant: FeedbackVariant;
  readonly icon?: FeedbackToastIcon;
  readonly title: string;
  readonly description?: string;
  readonly action?: {
    readonly label: string;
    readonly href?: string;
    readonly onClick?: () => void;
  };
  readonly onClose: () => void;
}) {
  const Icon = icons[icon];
  const tone = tones[variant];
  const actionClass =
    "inline-flex min-h-8 items-center rounded-md text-sm font-semibold text-teal-700 outline-none transition hover:text-teal-900 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2";

  return (
    <div
      className={`shopmind-toast-card grid min-h-[120px] w-full grid-cols-[48px_minmax(0,1fr)_24px] items-start gap-x-4 rounded-[14px] border bg-white p-[18px] text-slate-950 shadow-[0_10px_28px_rgba(15,23,42,0.12)] ${tone.border}`}
    >
      <span
        className={`grid size-12 place-items-center rounded-full border ${tone.circle}`}
      >
        <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-base font-bold leading-6 text-slate-950">{title}</p>
        {description ? (
          <p className="mt-1 text-sm leading-[1.5] text-slate-600">
            {description}
          </p>
        ) : null}
        {action ? (
          action.href ? (
            <Link
              href={action.href}
              onClick={onClose}
              className={`mt-2 ${actionClass}`}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                action.onClick?.();
                onClose();
              }}
              className={`mt-2 ${actionClass}`}
            >
              {action.label}
            </button>
          )
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="-mr-1 -mt-1 grid size-8 place-items-center rounded-full text-slate-600 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <X className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
      </button>
    </div>
  );
}
