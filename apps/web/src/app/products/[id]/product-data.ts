import { cache } from "react";
import { getProduct } from "@/lib/api/client";

export const getProductPageData = cache(getProduct);
