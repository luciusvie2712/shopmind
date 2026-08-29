import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrderRepository } from './order.repository';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';

@Module({
  imports: [AuthModule, FulfillmentModule],
  controllers: [OrdersController],
  providers: [OrderRepository, OrdersService],
})
export class OrdersModule {}
