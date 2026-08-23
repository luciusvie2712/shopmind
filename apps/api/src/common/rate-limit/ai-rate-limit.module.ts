import { Module } from '@nestjs/common';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimitService } from './ai-rate-limit.service';

@Module({
  providers: [AiRateLimitGuard, AiRateLimitService],
  exports: [AiRateLimitGuard, AiRateLimitService],
})
export class AiRateLimitModule {}
