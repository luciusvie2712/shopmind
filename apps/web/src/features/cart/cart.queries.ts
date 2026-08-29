"use client";

import type { CartContract, ProductSummaryContract } from "@shopmind/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify, notifyMutationError } from "@/lib/feedback";
import {
  addCartItem,
  checkoutCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/client";

export const cartQueryKey = ["cart"] as const;
export const ordersQueryKey = ["orders"] as const;

export function useCartQuery() {
  return useQuery({ queryKey: cartQueryKey, queryFn: getCart });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
      product: ProductSummaryContract;
    }) => addCartItem(productId, quantity),
    onSuccess: (cart, { productId, product, quantity }) => {
      queryClient.setQueryData(cartQueryKey, cart);
      notify(`cart:add:${productId}`, "success", "Added to cart", {
        description: `${product.title} has been added to your cart.`,
        icon: "cart",
        action: {
          label: `View cart${quantity > 1 ? ` (${quantity})` : ""}`,
          href: "/cart",
        },
      });
    },
    onError: (error, { productId }) =>
      notifyMutationError(
        error,
        `cart:add:${productId}`,
        "Couldn’t update your cart",
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => updateCartItem(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previous = queryClient.getQueryData<CartContract>(cartQueryKey);
      if (previous)
        queryClient.setQueryData(
          cartQueryKey,
          optimisticQuantity(previous, productId, quantity),
        );
      return { previous };
    },
    onError: (error, { productId }, context) => {
      if (context?.previous)
        queryClient.setQueryData(cartQueryKey, context.previous);
      notifyMutationError(
        error,
        `cart:update:${productId}`,
        "Couldn’t update your cart",
      );
    },
    onSuccess: (cart) => queryClient.setQueryData(cartQueryKey, cart),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
    }: {
      readonly productId: string;
      readonly product: ProductSummaryContract;
    }) => removeCartItem(productId),
    onMutate: async ({ productId }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previous = queryClient.getQueryData<CartContract>(cartQueryKey);
      if (previous)
        queryClient.setQueryData(
          cartQueryKey,
          optimisticRemove(previous, productId),
        );
      return { previous };
    },
    onError: (error, { productId }, context) => {
      if (context?.previous)
        queryClient.setQueryData(cartQueryKey, context.previous);
      notifyMutationError(
        error,
        `cart:remove:${productId}`,
        "Couldn’t update your cart",
      );
    },
    onSuccess: (cart, { productId, product }) => {
      queryClient.setQueryData(cartQueryKey, cart);
      notify(`cart:remove:${productId}`, "neutral", "Removed from cart", {
        description: `${product.title} has been removed from your cart.`,
        icon: "cart",
        action: { label: "View cart", href: "/cart" },
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkoutCart,
    onSuccess: (order) => {
      queryClient.setQueryData<CartContract>(cartQueryKey, {
        items: [],
        subtotal: 0,
        total: 0,
      });
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      notify("checkout", "success", "Checkout successful", {
        description: `Order ${order.id.slice(0, 8)}… was created successfully.`,
        icon: "checkout",
        action: { label: "View orders", href: "/orders" },
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
  });
}

function withTotals(
  cart: CartContract,
  items: CartContract["items"],
): CartContract {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, subtotal, total: subtotal };
}

function optimisticQuantity(
  cart: CartContract,
  productId: string,
  quantity: number,
): CartContract {
  return withTotals(
    cart,
    cart.items.map((item) =>
      item.product.id === productId
        ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
        : item,
    ),
  );
}

function optimisticRemove(cart: CartContract, productId: string): CartContract {
  return withTotals(
    cart,
    cart.items.filter((item) => item.product.id !== productId),
  );
}
