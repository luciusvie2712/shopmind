"use client";

import { toast } from "sonner";
import { createElement } from "react";
import { AppToastCard } from "@/components/feedback/app-toast";
import { ApiClientError } from "./api/client";

export type FeedbackVariant =
  "success" | "info" | "warning" | "error" | "neutral";
export type FeedbackToastIcon =
  | "default"
  | "cart"
  | "wishlist"
  | "compare"
  | "checkout"
  | "ai"
  | "network"
  | "warning"
  | "error";

export interface FeedbackToastOptions {
  readonly description?: string;
  readonly icon?: FeedbackToastIcon;
  readonly action?: {
    readonly label: string;
    readonly href?: string;
    readonly onClick?: () => void;
  };
}

interface ErrorFeedback {
  readonly presentation: "inline" | "toast";
  readonly variant: FeedbackVariant;
  readonly title: string;
  readonly description: string;
}

// Never surface arbitrary server messages or infer semantics from their text.
export function getErrorFeedback(error: unknown): ErrorFeedback {
  const code = error instanceof ApiClientError ? error.code : undefined;
  switch (code) {
    case "VALIDATION_ERROR":
      return {
        presentation: "inline",
        variant: "error",
        title: "Check your details",
        description: "Review your input and try again.",
      };
    case "AUTH_REQUIRED":
      return {
        presentation: "inline",
        variant: "warning",
        title: "Sign in required",
        description: "Sign in again to continue.",
      };
    case "FORBIDDEN":
      return {
        presentation: "inline",
        variant: "error",
        title: "Access denied",
        description: "This action is not available to your account.",
      };
    case "PRODUCT_NOT_FOUND":
      return {
        presentation: "inline",
        variant: "warning",
        title: "Product not found",
        description:
          "This product is no longer available. Choose another product.",
      };
    case "OUT_OF_STOCK":
      return {
        presentation: "inline",
        variant: "warning",
        title: "Stock changed",
        description: "Review the available quantity before trying again.",
      };
    case "AI_PROVIDER_TIMEOUT":
      return {
        presentation: "inline",
        variant: "warning",
        title: "AI request took too long",
        description:
          "Your request is still available. Try again when you are ready.",
      };
    case "AI_INVALID_OUTPUT":
      return {
        presentation: "inline",
        variant: "warning",
        title: "AI response could not be validated",
        description: "No unverified results were used. Try again.",
      };
    case "AI_RATE_LIMITED":
      return {
        presentation: "inline",
        variant: "warning",
        title: "Please try again later",
        description: "The AI request limit was reached.",
      };
    case "EXTERNAL_DATA_ERROR":
      return {
        presentation: "inline",
        variant: "error",
        title: "Request unavailable",
        description:
          "This request could not be completed. Please try again later.",
      };
    default:
      return {
        presentation: "toast",
        variant: "error",
        title: "ShopMind is temporarily unavailable",
        description: "Please try again.",
      };
  }
}

const durations: Record<FeedbackVariant, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
  neutral: 4000,
};

export function notify(
  id: string,
  variant: FeedbackVariant,
  title: string,
  options: FeedbackToastOptions = {},
): void {
  // A repeated action replaces its toast; evict old events instead of queuing them.
  const otherToasts = toast.getToasts().filter((item) => item.id !== id);
  for (const item of otherToasts.slice(
    0,
    Math.max(0, otherToasts.length - 2),
  )) {
    toast.dismiss(item.id);
  }
  toast.custom(
    (toastId) =>
      createElement(AppToastCard, {
        variant,
        icon: options.icon,
        title,
        description: options.description,
        action: options.action,
        onClose: () => toast.dismiss(toastId),
      }),
    { id, duration: durations[variant] },
  );
}

export function notifyMutationError(
  error: unknown,
  id: string,
  title: string,
): void {
  // Update in place: dismissing and recreating the same id races Sonner's exit lifecycle.
  if (getErrorFeedback(error).presentation === "toast") {
    notify(id, "error", title, {
      description: "The change was rolled back. Please try again.",
      icon: "error",
    });
  } else {
    toast.dismiss(id);
  }
}
