"use client";

import { use } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { OrderDetailContent } from "@/features/orders/order-detail-content";

export default function OrderDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <main className="bg-white/70"><div className="page-shell py-8"><ProtectedRoute><Link href="/orders" className="text-sm font-semibold text-teal-700">← Đơn hàng</Link><header className="mt-5"><h1 className="page-title mt-0">Thanh toán & giao hàng</h1><p className="mt-3 text-sm text-slate-600">Mô phỏng portfolio trong khoảng 90 giây, không có giao dịch thật.</p></header><div className="mt-8"><OrderDetailContent orderId={id} /></div></ProtectedRoute></div></main>;
}
