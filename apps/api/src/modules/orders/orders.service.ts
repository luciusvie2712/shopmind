import type { OrderContract, OrderListContract } from '@shopmind/contracts';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import {
  CheckoutOutOfStockError,
  CheckoutProductMissingError,
} from './order-calculation';
import { toOrderContract } from './order.mapper';
import { EmptyCartError, OrderRepository } from './order.repository';

@Injectable()
export class OrdersService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async list(userId: string): Promise<OrderListContract> {
    const orders = await this.orderRepository.list(userId);
    return { items: orders.map(toOrderContract) };
  }

  async checkout(userId: string): Promise<OrderContract> {
    try {
      return toOrderContract(await this.orderRepository.checkout(userId));
    } catch (error) {
      if (error instanceof EmptyCartError) {
        throw new BadRequestException('Cart must contain at least one item');
      }
      if (error instanceof CheckoutProductMissingError) {
        throw new ApiException(
          ERROR_CODES.PRODUCT_NOT_FOUND,
          'A cart product is no longer available',
        );
      }
      if (error instanceof CheckoutOutOfStockError) {
        throw new ApiException(
          ERROR_CODES.OUT_OF_STOCK,
          'A cart quantity exceeds current stock',
        );
      }
      throw error;
    }
  }
}
