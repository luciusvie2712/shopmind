import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { EventsController } from './events.controller';
import { EventsRateLimitService } from './events-rate-limit.service';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [AuthModule, RedisModule],
  controllers: [EventsController],
  providers: [EventsRateLimitService, EventsRepository, EventsService],
  exports: [EventsRepository],
})
export class EventsModule {}
