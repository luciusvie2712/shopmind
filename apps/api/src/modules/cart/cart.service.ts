import type { CartContract } from '@shopmind/contracts';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { toCartContract } from './cart.mapper';
import {
  CartItemMissingError,
  CartOutOfStockError,
  CartProductUnavailableError,
  CartRepository,
} from './cart.repository';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

  async get(userId: string): Promise<CartContract> {
    return toCartContract(await this.cartRepository.findByUserId(userId));
  }

  async add(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartContract> {
    try {
      return toCartContract(
        await this.cartRepository.addItem(userId, productId, quantity),
      );
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async update(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartContract> {
    try {
      return toCartContract(
        await this.cartRepository.updateItem(userId, productId, quantity),
      );
    } catch (error) {
      this.mapMutationError(error);
    }
  }

  async remove(userId: string, productId: string): Promise<CartContract> {
    return toCartContract(
      await this.cartRepository.removeItem(userId, productId),
    );
  }

  private mapMutationError(error: unknown): never {
    if (error instanceof CartProductUnavailableError) {
      throw new ApiException(
        ERROR_CODES.PRODUCT_NOT_FOUND,
        'Product was not found',
      );
    }
    if (error instanceof CartOutOfStockError) {
      throw new ApiException(
        ERROR_CODES.OUT_OF_STOCK,
        'Requested quantity exceeds current stock',
      );
    }
    if (error instanceof CartItemMissingError) {
      throw new BadRequestException('Cart item does not exist');
    }
    throw error;
  }
}
