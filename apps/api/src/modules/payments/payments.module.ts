import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentRateLimitGuard } from './payment-rate-limit.guard';
import { PaymentRepository } from './payment.repository';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripePaymentProvider } from './stripe-payment.provider';
@Module({
  imports: [AuthModule, RedisModule],
  controllers: [PaymentsController],
  providers: [
    PaymentRateLimitGuard,
    PaymentRepository,
    PaymentsService,
    StripePaymentProvider,
  ],
})
export class PaymentsModule {}
