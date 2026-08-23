import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import { productSummarySelection } from '../products/product.repository';

const wishlistSelection = {
  product: { select: productSummarySelection },
} as const satisfies Prisma.WishlistItemSelect;

export type WishlistItemRecord = Prisma.WishlistItemGetPayload<{
  select: typeof wishlistSelection;
}>;

@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<WishlistItemRecord[]> {
    return this.prisma.wishlistItem.findMany({
      where: { userId, product: { sourceStatus: SOURCE_STATUS.active } },
      select: wishlistSelection,
      orderBy: { productId: 'asc' },
    });
  }

  async add(userId: string, productId: string): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sourceStatus: SOURCE_STATUS.active },
      select: { id: true },
    });
    if (product === null) return false;

    await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return true;
  }

  remove(userId: string, productId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  }
}
