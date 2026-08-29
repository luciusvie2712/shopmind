import type {
  OrderContract,
  OrderDetailContract,
  OrderListContract,
} from '@shopmind/contracts';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
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

  @Get(':orderId')
  @ApiOperation({
    summary: 'Get an owned order with payment and fulfillment details',
  })
  detail(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailContract> {
    return this.ordersService.detail(orderId, user.id);
  }
}
