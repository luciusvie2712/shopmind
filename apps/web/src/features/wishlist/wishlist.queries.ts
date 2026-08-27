"use client";

import type {
  ProductSummaryContract,
  WishlistContract,
} from "@shopmind/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify, notifyMutationError } from "@/lib/feedback";
import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from "@/lib/api/client";

export const wishlistQueryKey = ["wishlist"] as const;

export function useWishlistQuery(enabled = true) {
  return useQuery({
    queryKey: wishlistQueryKey,
    queryFn: getWishlist,
    enabled,
  });
}

export function useWishlistToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      add,
    }: {
      productId: string;
      add: boolean;
      product: ProductSummaryContract;
    }) => (add ? addWishlistItem(productId) : removeWishlistItem(productId)),
    onMutate: async ({ product, add }) => {
      await queryClient.cancelQueries({ queryKey: wishlistQueryKey });
      const previous =
        queryClient.getQueryData<WishlistContract>(wishlistQueryKey);
      if (previous) {
        const items = add
          ? previous.items.some(({ id }) => id === product.id)
            ? previous.items
            : [...previous.items, product]
          : previous.items.filter(({ id }) => id !== product.id);
        queryClient.setQueryData<WishlistContract>(wishlistQueryKey, { items });
      }
      return { previous };
    },
    onError: (error, { productId }, context) => {
      if (context?.previous)
        queryClient.setQueryData(wishlistQueryKey, context.previous);
      notifyMutationError(error, `wishlist:${productId}`, "Couldn’t update your wishlist");
    },
    onSuccess: (_result, { productId, add }) => {
      notify(`wishlist:${productId}`, "success", add ? "Saved to wishlist" : "Removed from wishlist");
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: wishlistQueryKey }),
  });
}
