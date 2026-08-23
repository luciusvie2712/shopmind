import { Prisma } from '@prisma/client';
import { toCartContract } from './cart.mapper';
import type { CartRecord } from './cart.repository';

describe('toCartContract', () => {
  it('calculates line and cart totals from current database price', () => {
    const cart = {
      id: 'cart',
      userId: 'user',
      items: [
        {
          id: 'item',
          quantity: 3,
          product: {
            id: 'product',
            title: 'Canonical product',
            brand: null,
            price: new Prisma.Decimal('19.99'),
            rating: new Prisma.Decimal('4.50'),
            stock: 5,
            thumbnail: null,
            category: { id: 'category', slug: 'test', name: 'Test' },
          },
        },
      ],
    } as CartRecord;

    expect(toCartContract(cart)).toMatchObject({
      subtotal: 59.97,
      total: 59.97,
      items: [{ unitPrice: 19.99, lineTotal: 59.97, quantity: 3 }],
    });
  });

  it('returns exact zero totals for an empty cart', () => {
    expect(toCartContract(null)).toEqual({
      items: [],
      subtotal: 0,
      total: 0,
    });
  });
});
