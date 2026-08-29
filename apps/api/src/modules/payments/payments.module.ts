import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentRateLimitGuard } from './payment-rate-limit.guard';
import { PaymentRepository } from './payment.repository';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripePaymentProvider } from './stripe-payment.provider';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { DemoPaymentRepository } from './demo-payment.repository';
import { DemoPaymentsService } from './demo-payments.service';
import { DemoPaymentsController } from './demo-payments.controller';
@Module({
  imports: [AuthModule, RedisModule, FulfillmentModule],
  controllers: [PaymentsController, DemoPaymentsController],
  providers: [
    PaymentRateLimitGuard,
    PaymentRepository,
    PaymentsService,
    StripePaymentProvider,
    DemoPaymentRepository,
    DemoPaymentsService,
  ],
})
export class PaymentsModule {}
