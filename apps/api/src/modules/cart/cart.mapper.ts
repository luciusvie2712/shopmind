import type { CartContract } from '@shopmind/contracts';
import { Prisma } from '@prisma/client';
import { toProductSummaryContract } from '../products/product.mapper';
import type { CartRecord } from './cart.repository';

export function toCartContract(cart: CartRecord | null): CartContract {
  let subtotal = new Prisma.Decimal(0);
  const items = (cart?.items ?? []).map((item) => {
    const lineTotal = item.product.price.mul(item.quantity);
    subtotal = subtotal.add(lineTotal);
    return {
      id: item.id,
      product: toProductSummaryContract(item.product),
      quantity: item.quantity,
      unitPrice: item.product.price.toNumber(),
      lineTotal: lineTotal.toNumber(),
    };
  });

  return {
    items,
    subtotal: subtotal.toNumber(),
    total: subtotal.toNumber(),
  };
}
