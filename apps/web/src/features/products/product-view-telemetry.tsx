"use client";

import { useEffect } from "react";
import { trackEventOnce } from "@/lib/telemetry";

export function ProductViewTelemetry({ productId }: { readonly productId: string }) {
  useEffect(() => {
    trackEventOnce(`product-view:${productId}`, {
      type: "PRODUCT_VIEW",
      productId,
      metadata: { surface: "product_detail" },
    });
  }, [productId]);
  return null;
}
