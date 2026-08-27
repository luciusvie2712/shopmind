"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="light"
      position="top-right"
      visibleToasts={3}
      expand
      closeButton
      gap={12}
      offset={24}
      mobileOffset={16}
      containerAriaLabel="Notifications"
      style={{ width: "min(380px, calc(100vw - 32px))" }}
      icons={{
        success: <CircleCheck className="size-5 text-teal-700" aria-hidden="true" />,
        info: <Info className="size-5 text-blue-700" aria-hidden="true" />,
        warning: <TriangleAlert className="size-5 text-amber-700" aria-hidden="true" />,
        error: <CircleAlert className="size-5 text-red-700" aria-hidden="true" />,
      }}
      toastOptions={{
        className: "shopmind-toast",
        closeButtonAriaLabel: "Close notification",
      }}
    />
  );
}
