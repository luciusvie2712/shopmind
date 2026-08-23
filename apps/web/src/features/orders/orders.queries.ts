"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/lib/api/client";
import { ordersQueryKey } from "@/features/cart/cart.queries";

export function useOrdersQuery() {
  return useQuery({ queryKey: ordersQueryKey, queryFn: getOrders });
}
