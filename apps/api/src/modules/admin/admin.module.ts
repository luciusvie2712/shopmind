import { Module } from '@nestjs/common';
import { QueueModule } from '../../common/queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAnalyticsRepository } from './admin-analytics.repository';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminManagementRepository } from './admin-management.repository';
import { AdminManagementService } from './admin-management.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [AdminController],
  providers: [
    AdminAnalyticsRepository,
    AdminAnalyticsService,
    AdminManagementRepository,
    AdminManagementService,
  ],
})
export class AdminModule {}
