"use client";

import { useState } from "react";
import {
  AppAlertDialog,
  type AppDialogVariant,
  DialogProductPreview,
  DialogSummary,
} from "@/components/feedback/app-alert-dialog";
import { notify } from "@/lib/feedback";

const modalExamples: readonly {
  readonly variant: AppDialogVariant;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
}[] = [
  {
    variant: "auth",
    label: "Auth",
    title: "Sign in required",
    description:
      "Please sign in to save items and access your ShopMind account.",
    confirmLabel: "Sign in",
  },
  {
    variant: "destructive",
    label: "Destructive",
    title: "Remove item?",
    description: "Are you sure you want to remove this item?",
    confirmLabel: "Remove",
  },
  {
    variant: "success",
    label: "Success",
    title: "Action completed",
    description: "The requested action was completed successfully.",
  },
  {
    variant: "warning",
    label: "Warning",
    title: "Review this change",
    description: "Check the available information before continuing.",
    confirmLabel: "Continue",
  },
  {
    variant: "info",
    label: "Compare / info",
    title: "Compare selection",
    description: "Review your selected products before opening comparison.",
    confirmLabel: "View compare",
  },
] as const;

export function FeedbackShowcase() {
  const [active, setActive] = useState<AppDialogVariant | null>("destructive");
  const current = modalExamples.find(({ variant }) => variant === active);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="page-kicker">Development only</p>
        <h1 className="page-title">Feedback visual showcase</h1>
        <p className="page-description">
          Individual runtime components for reference comparison. Only one modal
          opens at a time and toast visibility remains capped at three.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="surface-card p-6">
            <h2 className="text-lg font-bold text-slate-950">Modal variants</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {modalExamples.map((example) => (
                <button
                  key={example.variant}
                  type="button"
                  onClick={() => setActive(example.variant)}
                  className="btn-secondary"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-lg font-bold text-slate-950">Toast variants</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <ShowToastButton variant="success" label="Success" icon="cart" />
              <ShowToastButton
                variant="success"
                label="Wishlist"
                icon="wishlist"
              />
              <ShowToastButton variant="info" label="Info" icon="compare" />
              <ShowToastButton
                variant="warning"
                label="Warning"
                icon="warning"
              />
              <ShowToastButton variant="error" label="Error" icon="error" />
              <ShowToastButton
                variant="neutral"
                label="Neutral"
                icon="wishlist"
              />
            </div>
          </section>
        </div>
      </div>

      {current ? (
        <AppAlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setActive(null);
          }}
          variant={current.variant}
          title={current.title}
          description={current.description}
          cancelLabel={current.confirmLabel ? "Cancel" : "Close"}
          confirmLabel={current.confirmLabel}
          onConfirm={() => setActive(null)}
        >
          {current.variant === "destructive" ? (
            <DialogProductPreview
              thumbnail={null}
              title="Current product"
              detail="Canonical details supplied at runtime"
            />
          ) : current.variant === "success" ? (
            <DialogSummary>
              <div className="flex items-center justify-between gap-4">
                <span>Runtime summary</span>
                <strong>Canonical data</strong>
              </div>
            </DialogSummary>
          ) : null}
        </AppAlertDialog>
      ) : null}
    </main>
  );
}

function ShowToastButton({
  variant,
  label,
  icon,
}: {
  readonly variant: "success" | "info" | "warning" | "error" | "neutral";
  readonly label: string;
  readonly icon: "cart" | "wishlist" | "compare" | "warning" | "error";
}) {
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={() =>
        notify(`showcase:${variant}`, variant, `${label} notification`, {
          description:
            "Runtime context appears here with the same spacing as production feedback.",
          icon,
          action: { label: "View details", onClick: () => undefined },
        })
      }
    >
      {label}
    </button>
  );
}
