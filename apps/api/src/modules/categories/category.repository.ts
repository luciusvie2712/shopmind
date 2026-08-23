import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import { type CategoryContract } from '../products/product.contract';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<CategoryContract[]> {
    return this.prisma.category.findMany({
      where: { products: { some: { sourceStatus: SOURCE_STATUS.active } } },
      select: { id: true, slug: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
}
