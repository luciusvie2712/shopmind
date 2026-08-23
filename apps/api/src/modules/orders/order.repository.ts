import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import { calculateCheckout } from './order-calculation';

const orderInclude = {
  items: { orderBy: { id: 'asc' as const } },
} as const satisfies Prisma.OrderInclude;

export type OrderRecord = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

interface LockedCartItem {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
}

export class EmptyCartError extends Error {}

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<OrderRecord[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  checkout(userId: string): Promise<OrderRecord> {
    return this.prisma.$transaction<OrderRecord>(async (tx) => {
      const cartItems = await tx.$queryRaw<LockedCartItem[]>(Prisma.sql`
        SELECT
          ci.id,
          ci.product_id AS "productId",
          ci.quantity
        FROM cart_items ci
        INNER JOIN carts c ON c.id = ci.cart_id
        WHERE c.user_id = ${userId}::uuid
        ORDER BY ci.id
        FOR UPDATE OF ci
      `);
      if (cartItems.length === 0) throw new EmptyCartError();

      const products = await tx.product.findMany({
        where: {
          id: { in: cartItems.map(({ productId }) => productId) },
          sourceStatus: SOURCE_STATUS.active,
        },
        select: { id: true, title: true, price: true, stock: true },
      });
      const checkout = calculateCheckout(cartItems, products);

      const order = await tx.order.create({
        data: {
          userId,
          status: 'CREATED',
          subtotal: checkout.subtotal,
          total: checkout.subtotal,
          items: { create: [...checkout.items] },
        },
        include: orderInclude,
      });
      await tx.cartItem.deleteMany({
        where: { id: { in: cartItems.map(({ id }) => id) } },
      });
      return order;
    });
  }
}
