import type { OrderContract } from '@shopmind/contracts';
import type { OrderRecord } from './order.repository';

export function toOrderContract(order: OrderRecord): OrderContract {
  return {
    id: order.id,
    status: order.status,
    subtotal: order.subtotal.toNumber(),
    total: order.total.toNumber(),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitleSnapshot: item.productTitleSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot.toNumber(),
      quantity: item.quantity,
      lineTotal: item.unitPriceSnapshot.mul(item.quantity).toNumber(),
    })),
  };
}
