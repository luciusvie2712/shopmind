import { Prisma } from '@prisma/client';

export interface CheckoutCartItem {
  readonly productId: string;
  readonly quantity: number;
}

export interface CheckoutProduct {
  readonly id: string;
  readonly title: string;
  readonly price: Prisma.Decimal;
  readonly stock: number;
}

export interface OrderItemSnapshot {
  readonly productId: string;
  readonly productTitleSnapshot: string;
  readonly unitPriceSnapshot: Prisma.Decimal;
  readonly quantity: number;
}

export class CheckoutProductMissingError extends Error {}
export class CheckoutOutOfStockError extends Error {}

export function calculateCheckout(
  cartItems: readonly CheckoutCartItem[],
  products: readonly CheckoutProduct[],
): {
  readonly subtotal: Prisma.Decimal;
  readonly items: readonly OrderItemSnapshot[];
} {
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  let subtotal = new Prisma.Decimal(0);
  const items = cartItems.map((item) => {
    const product = productsById.get(item.productId);
    if (product === undefined) throw new CheckoutProductMissingError();
    if (item.quantity > product.stock) throw new CheckoutOutOfStockError();
    subtotal = subtotal.add(product.price.mul(item.quantity));
    return {
      productId: product.id,
      productTitleSnapshot: product.title,
      unitPriceSnapshot: product.price,
      quantity: item.quantity,
    };
  });
  return { subtotal, items };
}
