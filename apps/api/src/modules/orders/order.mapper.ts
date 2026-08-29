import type { OrderContract } from '@shopmind/contracts';
import type { OrderDetailContract } from '@shopmind/contracts';
import { toDemoPaymentSummary } from '../payments/demo-payment.mapper';
import { toFulfillmentSummary } from '../fulfillment/fulfillment.mapper';
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
      productThumbnail: item.product.thumbnail,
      productTitleSnapshot: item.productTitleSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot.toNumber(),
      quantity: item.quantity,
      lineTotal: item.unitPriceSnapshot.mul(item.quantity).toNumber(),
    })),
    paymentStatus: order.payment?.status ?? null,
    fulfillmentStatus: order.fulfillment?.status ?? null,
  };
}

export function toOrderDetailContract(order: OrderRecord): OrderDetailContract {
  if (!order.payment || order.payment.provider !== 'SIMULATED')
    throw new Error('Order does not have a simulated payment');
  return {
    ...toOrderContract(order),
    currency: order.payment.currency.toUpperCase(),
    payment: toDemoPaymentSummary(order.payment),
    fulfillment: order.fulfillment
      ? toFulfillmentSummary(order.fulfillment)
      : null,
  };
}
