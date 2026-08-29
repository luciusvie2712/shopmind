import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/admin-shell";

export default function AdminLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
