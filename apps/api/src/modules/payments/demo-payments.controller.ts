import type {
  OrderPaymentSummary,
  SimulatePaymentResponse,
} from '@shopmind/contracts';
import {
  Body,
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
import { DemoPaymentsService } from './demo-payments.service';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

@Controller('orders')
@UseGuards(AccessTokenGuard)
export class DemoPaymentsController {
  constructor(private readonly payments: DemoPaymentsService) {}
  @Get(':orderId/payment')
  @ApiOperation({ summary: 'Get the owned order demo payment presentation' })
  get(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderPaymentSummary> {
    return this.payments.get(orderId, user.id);
  }
  @Post(':orderId/payment/simulate-success')
  @ApiOperation({ summary: 'Confirm demo payment and start fulfillment' })
  confirm(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SimulatePaymentDto,
  ): Promise<SimulatePaymentResponse> {
    return this.payments.confirm(orderId, user.id, body.deliveryScenario);
  }
}
