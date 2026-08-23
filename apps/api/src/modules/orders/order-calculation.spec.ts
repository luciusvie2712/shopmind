import { Prisma } from '@prisma/client';
import {
  calculateCheckout,
  CheckoutOutOfStockError,
} from './order-calculation';

describe('calculateCheckout', () => {
  const product = {
    id: 'product',
    title: 'Snapshot title',
    price: new Prisma.Decimal('12.50'),
    stock: 3,
  };

  it('calculates totals and immutable title/price snapshots', () => {
    const result = calculateCheckout(
      [{ productId: product.id, quantity: 2 }],
      [product],
    );
    expect(result.subtotal.toFixed(2)).toBe('25.00');
    expect(result.items).toEqual([
      {
        productId: product.id,
        productTitleSnapshot: 'Snapshot title',
        unitPriceSnapshot: product.price,
        quantity: 2,
      },
    ]);
  });

  it('rejects quantities above current stock', () => {
    expect(() =>
      calculateCheckout([{ productId: product.id, quantity: 4 }], [product]),
    ).toThrow(CheckoutOutOfStockError);
  });
});
