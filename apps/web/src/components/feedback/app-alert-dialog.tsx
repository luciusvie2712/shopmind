"use client";

import {
  CircleCheck,
  GitCompareArrows,
  Heart,
  LockKeyhole,
  ShoppingBag,
  TriangleAlert,
  X,
} from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useId, useRef } from "react";

export type AppDialogVariant =
  "auth" | "destructive" | "success" | "warning" | "info";

const variants = {
  auth: { icon: LockKeyhole, circle: "bg-indigo-50 text-indigo-600" },
  destructive: { icon: Heart, circle: "bg-rose-50 text-rose-600" },
  success: { icon: CircleCheck, circle: "bg-teal-50 text-teal-600" },
  warning: { icon: TriangleAlert, circle: "bg-amber-50 text-amber-600" },
  info: { icon: GitCompareArrows, circle: "bg-indigo-50 text-indigo-600" },
} as const;

export function AppAlertDialog({
  open,
  onOpenChange,
  variant = "info",
  title,
  description,
  children,
  cancelLabel = "Cancel",
  confirmLabel,
  onConfirm,
  confirmPending = false,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly variant?: AppDialogVariant;
  readonly title: string;
  readonly description: string;
  readonly children?: ReactNode;
  readonly cancelLabel?: string;
  readonly confirmLabel?: string;
  readonly onConfirm?: () => void;
  readonly confirmPending?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const visual = variants[variant];
  const Icon = visual.icon;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close(): void {
    onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => onOpenChange(false)}
      className="app-feedback-dialog m-auto w-[min(382px,calc(100vw-32px))] rounded-[20px] border border-slate-200 bg-white px-6 pb-7 pt-8 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.18)] outline-none backdrop:bg-[rgba(20,32,58,0.56)] backdrop:backdrop-blur-[3px] sm:px-8 sm:pb-8 sm:pt-8"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close dialog"
        className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500 sm:right-[18px] sm:top-[18px]"
      >
        <X className="size-5" strokeWidth={1.65} aria-hidden="true" />
      </button>

      <span
        className={`mx-auto grid size-[72px] place-items-center rounded-full ${visual.circle}`}
      >
        <Icon className="size-8" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2
        id={titleId}
        className="mt-5 text-center text-[21px] font-bold leading-[1.25] text-slate-950"
      >
        {title}
      </h2>
      <p
        id={descriptionId}
        className="mx-auto mt-2.5 max-w-[290px] text-center text-sm leading-[1.55] text-slate-600"
      >
        {description}
      </p>

      {children ? <div className="mt-6">{children}</div> : null}

      <div
        className={`mt-6 grid gap-4 ${confirmLabel ? "grid-cols-2" : "grid-cols-1"}`}
      >
        <button
          type="button"
          onClick={close}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          {cancelLabel}
        </button>
        {confirmLabel ? (
          <button
            type="button"
            disabled={confirmPending}
            onClick={onConfirm}
            className={`inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${variant === "destructive" ? "border-red-400 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-500" : "border-teal-600 bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500"}`}
          >
            {confirmPending ? "Please wait…" : confirmLabel}
          </button>
        ) : null}
      </div>
    </dialog>
  );
}

export function DialogProductPreview({
  thumbnail,
  title,
  detail,
}: {
  readonly thumbnail: string | null;
  readonly title: string;
  readonly detail?: string;
}) {
  return (
    <div className="flex items-center gap-4 text-left">
      <span className="relative grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="72px"
            className="object-contain p-2"
          />
        ) : (
          <ShoppingBag className="size-6 text-slate-400" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
          {title}
        </span>
        {detail ? (
          <span className="mt-1 block text-sm font-bold text-slate-900">
            {detail}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function DialogSummary({ children }: { readonly children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-950">
      {children}
    </div>
  );
}
