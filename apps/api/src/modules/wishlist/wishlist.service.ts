import type { WishlistContract } from '@shopmind/contracts';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { toProductSummaryContract } from '../products/product.mapper';
import { WishlistRepository } from './wishlist.repository';

@Injectable()
export class WishlistService {
  constructor(private readonly wishlistRepository: WishlistRepository) {}

  async list(userId: string): Promise<WishlistContract> {
    const items = await this.wishlistRepository.list(userId);
    return {
      items: items.map(({ product }) => toProductSummaryContract(product)),
    };
  }

  async add(userId: string, productId: string): Promise<WishlistContract> {
    if (!(await this.wishlistRepository.add(userId, productId))) {
      throw new ApiException(
        ERROR_CODES.PRODUCT_NOT_FOUND,
        'Product was not found',
      );
    }
    return this.list(userId);
  }

  async remove(userId: string, productId: string): Promise<WishlistContract> {
    await this.wishlistRepository.remove(userId, productId);
    return this.list(userId);
  }
}
