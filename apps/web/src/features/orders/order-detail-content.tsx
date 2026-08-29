"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { FeedbackAlert } from "@/components/feedback/feedback-alert";
import { getErrorFeedback } from "@/lib/feedback";
import { FulfillmentTimeline } from "./fulfillment-timeline";
import { useOrderDetail, useSimulatePayment } from "./order-detail.queries";

const scenarioSchema = z.object({ deliveryScenario: z.enum(["SUCCESS", "FAILURE"]) });
type ScenarioForm = z.infer<typeof scenarioSchema>;

export function OrderDetailContent({ orderId }: { readonly orderId: string }) {
  const order = useOrderDetail(orderId);
  const payment = useSimulatePayment(orderId);
  const form = useForm<ScenarioForm>({ defaultValues: { deliveryScenario: "SUCCESS" } });
  const [remaining, setRemaining] = useState<number | null>(null);
  const expected = order.data?.fulfillment?.expectedCompletionAt;
  useEffect(() => {
    if (!expected) return;
    const update = () => setRemaining(Math.max(0, new Date(expected).getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [expected]);

  if (order.isPending) return <div className="surface-card h-96 animate-pulse bg-slate-100" aria-label="Đang tải đơn hàng" />;
  if (order.isError) return <FeedbackAlert {...getErrorFeedback(order.error)} />;
  const data = order.data;
  const pending = data.payment.status === "PENDING";
  const submit = form.handleSubmit(async (values) => {
    const parsed = scenarioSchema.safeParse(values);
    if (parsed.success) await payment.mutateAsync(parsed.data.deliveryScenario);
  });
  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="surface-card p-5 sm:p-7" aria-labelledby="payment-title">
        <h2 id="payment-title" className="text-xl font-extrabold text-slate-950">ShopMind Demo Payment</h2>
        <p className="mt-2 font-mono text-sm text-slate-600">#{data.id}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <QRCodeSVG value={data.payment.qrPayload} size={188} level="M" title="Mã QR thanh toán mô phỏng ShopMind" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Số tiền canonical</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(data.payment.amount)}</p>
            <p className="mt-3 text-sm text-slate-600">Mã tham chiếu: <strong>{data.payment.reference}</strong></p>
            <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">{pending ? "Chờ thanh toán" : "Thanh toán thành công"}</span>
          </div>
        </div>
        <div className="mt-6 flex gap-3 rounded-2xl bg-teal-50 p-4 text-sm font-semibold text-teal-950"><ShieldCheck className="size-5 shrink-0" aria-hidden="true" /><p>Thanh toán mô phỏng — không thực hiện giao dịch thật.</p></div>
        <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4" aria-label="Sản phẩm trong đơn hàng">{data.items.map((item) => <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="font-semibold text-slate-900">{item.productTitleSnapshot} <span className="font-normal text-slate-500">× {item.quantity}</span></span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(item.lineTotal)}</strong></li>)}</ul>
        {pending ? (
          <form className="mt-6" onSubmit={submit}>
            <fieldset><legend className="text-sm font-bold text-slate-900">Kịch bản giao hàng</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(["SUCCESS", "FAILURE"] as const).map((scenario) => <label key={scenario} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-semibold"><input type="radio" value={scenario} {...form.register("deliveryScenario")} />{scenario === "SUCCESS" ? "Giao thành công" : "Giao hàng thất bại"}</label>)}
              </div>
            </fieldset>
            <button type="submit" disabled={payment.isPending} className="btn-primary mt-5 min-h-12 w-full">{payment.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{payment.isPending ? "Đang thanh toán..." : "Thanh toán"}</button>
            {payment.isError ? <div className="mt-4"><FeedbackAlert {...getErrorFeedback(payment.error)} /></div> : null}
          </form>
        ) : null}
      </section>
      <aside className="surface-card p-5 sm:p-7" aria-labelledby="fulfillment-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="fulfillment-title" className="text-lg font-extrabold text-slate-950">Theo dõi giao hàng</h2><p className="mt-1 text-xs text-slate-500">Trạng thái từ PostgreSQL</p></div>{order.isFetching ? <RefreshCw className="size-4 animate-spin text-teal-700" aria-label="Đang cập nhật" /> : null}</div>
        {data.fulfillment ? <><FulfillmentTimeline fulfillment={data.fulfillment} />{seconds !== null && !["DELIVERED", "DELIVERY_FAILED"].includes(data.fulfillment.status) ? <p className="mt-6 rounded-xl bg-slate-50 p-3 text-center text-sm font-semibold text-slate-700">Hoàn tất mô phỏng dự kiến trong: {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p> : null}</> : <div className="mt-8 text-center text-sm text-slate-500"><AlertTriangle className="mx-auto mb-3 size-6" aria-hidden="true" />Thanh toán để bắt đầu mô phỏng giao hàng.</div>}
      </aside>
    </div>
  );
}
