import type { OrderContract, OrderListContract } from '@shopmind/contracts';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../auth/services/access-token.service';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(AccessTokenGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  checkout(@CurrentUser() user: AuthenticatedUser): Promise<OrderContract> {
    return this.ordersService.checkout(user.id);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<OrderListContract> {
    return this.ordersService.list(user.id);
  }
}
