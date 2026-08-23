import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrderRepository } from './order.repository';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrderRepository, OrdersService],
})
export class OrdersModule {}
