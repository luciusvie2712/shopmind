import type { FulfillmentScenario, FulfillmentStatus, FulfillmentSummary } from "@shopmind/contracts";
import { Check, Circle, X } from "lucide-react";

const labels: Record<FulfillmentStatus, string> = {
  ORDER_RECEIVED: "Đã nhận đơn hàng",
  IN_TRANSIT: "Hàng đang được vận chuyển",
  OUT_FOR_DELIVERY: "Đang giao hàng",
  DELIVERED: "Đã giao thành công",
  DELIVERY_FAILED: "Giao hàng thất bại",
};
const progression: readonly FulfillmentStatus[] = ["ORDER_RECEIVED", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

export function FulfillmentTimeline({ fulfillment }: { readonly fulfillment: FulfillmentSummary }) {
  const final = fulfillment.scenario === "FAILURE" ? "DELIVERY_FAILED" : "DELIVERED";
  const statuses = [...progression, final] as const;
  const occurred = new Map(fulfillment.timeline.map((event) => [event.status, event.occurredAt]));
  return (
    <ol aria-label="Tiến trình giao hàng" className="mt-6 space-y-0">
      {statuses.map((status, index) => {
        const completedAt = occurred.get(status);
        const current = fulfillment.status === status;
        const failed = status === "DELIVERY_FAILED" && Boolean(completedAt);
        return (
          <li key={status} className="relative flex gap-4 pb-7 last:pb-0">
            {index < statuses.length - 1 ? <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-slate-200" /> : null}
            <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white ${failed ? "bg-red-100 text-red-700" : completedAt ? "bg-teal-600 text-white" : current ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`}>
              {failed ? <X className="size-4" aria-hidden="true" /> : completedAt ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
            </span>
            <div className="pt-1">
              <p className={`text-sm font-bold ${failed ? "text-red-800" : current ? "text-amber-900" : completedAt ? "text-slate-950" : "text-slate-500"}`}>{labels[status]}</p>
              <p className="mt-1 text-xs text-slate-500">{completedAt ? new Date(completedAt).toLocaleString("vi-VN") : current ? "Trạng thái hiện tại" : "Đang chờ"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function scenarioLabel(scenario: FulfillmentScenario): string {
  return scenario === "SUCCESS" ? "Giao thành công" : "Giao hàng thất bại";
}
