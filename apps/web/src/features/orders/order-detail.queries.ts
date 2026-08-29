"use client";

import type { OrderDetailContract } from "@shopmind/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrderDetail, simulateDemoPayment } from "@/lib/api/client";
import { ordersQueryKey } from "@/features/cart/cart.queries";

export const orderDetailQueryKey = (orderId: string) => ["orders", orderId] as const;
const terminal = new Set(["DELIVERED", "DELIVERY_FAILED"]);

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: orderDetailQueryKey(orderId),
    queryFn: () => getOrderDetail(orderId),
    refetchInterval: (query) => {
      const data = query.state.data as OrderDetailContract | undefined;
      return data?.fulfillment && !terminal.has(data.fulfillment.status) ? 2_500 : false;
    },
    refetchOnWindowFocus: true,
  });
}

export function useSimulatePayment(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scenario: "SUCCESS" | "FAILURE") => simulateDemoPayment(orderId, scenario),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderDetailQueryKey(orderId) });
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    },
  });
}
