import { AlertTriangle, PackageSearch, RefreshCw } from "lucide-react";

export function CompactDataState({
  kind,
  message,
  requestId,
}: {
  readonly kind: "empty" | "error";
  readonly message: string;
  readonly requestId?: string;
}) {
  const Icon = kind === "error" ? AlertTriangle : PackageSearch;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-2xl border border-dashed p-7 text-center ${
        kind === "error"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-slate-300 bg-slate-50 text-slate-700"
      }`}
    >
      <Icon className="mx-auto size-6" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold">{message}</p>
      {requestId ? (
        <p className="mt-1 font-mono text-xs opacity-70">Request ID: {requestId}</p>
      ) : null}
      {kind === "error" ? (
        <a href="" className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
          <RefreshCw className="size-4" aria-hidden="true" /> Retry
        </a>
      ) : null}
    </div>
  );
}
