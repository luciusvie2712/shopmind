import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import { productSummarySelection } from '../products/product.repository';

const cartSelection = {
  id: true,
  userId: true,
  items: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      quantity: true,
      product: { select: productSummarySelection },
    },
  },
} as const satisfies Prisma.CartSelect;

export type CartRecord = Prisma.CartGetPayload<{
  select: typeof cartSelection;
}>;

export class CartProductUnavailableError extends Error {}
export class CartOutOfStockError extends Error {}
export class CartItemMissingError extends Error {}

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<CartRecord | null> {
    return this.prisma.cart.findUnique({
      where: { userId },
      select: cartSelection,
    });
  }

  addItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartRecord> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, sourceStatus: SOURCE_STATUS.active },
        select: { stock: true },
      });
      if (product === null) throw new CartProductUnavailableError();

      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { id: true },
      });
      const item = await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity },
        update: { quantity: { increment: quantity } },
        select: { quantity: true },
      });
      if (item.quantity > product.stock) throw new CartOutOfStockError();

      await tx.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });

      return tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        select: cartSelection,
      });
    });
  }

  updateItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartRecord> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, sourceStatus: SOURCE_STATUS.active },
        select: { stock: true },
      });
      if (product === null) throw new CartProductUnavailableError();
      if (quantity > product.stock) throw new CartOutOfStockError();

      const updated = await tx.cartItem.updateMany({
        where: { productId, cart: { userId } },
        data: { quantity },
      });
      if (updated.count === 0) throw new CartItemMissingError();

      await tx.cart.update({
        where: { userId },
        data: { updatedAt: new Date() },
      });

      return tx.cart.findUniqueOrThrow({
        where: { userId },
        select: cartSelection,
      });
    });
  }

  removeItem(userId: string, productId: string): Promise<CartRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (cart === null) return null;
      await tx.cartItem.deleteMany({
        where: { productId, cartId: cart.id },
      });
      await tx.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });
      return tx.cart.findUnique({
        where: { id: cart.id },
        select: cartSelection,
      });
    });
  }
}
