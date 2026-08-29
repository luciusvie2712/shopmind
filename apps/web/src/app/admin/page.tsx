import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { PageHeader } from "@/features/admin/admin-resource-pages";

export default function AdminPage() {
  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Admin analytics"
          description="Canonical catalog, AI, behavior, worker, and commerce signals for the last 30 days."
        />
        <AdminDashboard />
      </div>
    </>
  );
}
