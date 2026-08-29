"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="light"
      position="top-right"
      visibleToasts={3}
      expand
      gap={14}
      offset={{ top: 96, right: 24 }}
      mobileOffset={16}
      containerAriaLabel="Notifications"
      style={{ width: "min(350px, calc(100vw - 32px))" }}
      toastOptions={{
        className: "shopmind-toast",
      }}
    />
  );
}
