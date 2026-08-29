import type {
  AdminAiLogListContract,
  AdminAnalyticsOverviewContract,
  AdminIngestionStatusContract,
  AdminOrderListContract,
  AdminPaymentListContract,
  AdminProductListContract,
  AdminUserListContract,
} from '@shopmind/contracts';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminManagementService } from './admin-management.service';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { AdminAnalyticsRangeDto } from './dto/admin-analytics-range.dto';

@Controller('admin')
@Roles(Role.ADMIN)
@UseGuards(AccessTokenGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly analytics: AdminAnalyticsService,
    private readonly management: AdminManagementService,
  ) {}

  @Get('analytics/overview')
  overview(
    @Query() query: AdminAnalyticsRangeDto,
  ): Promise<AdminAnalyticsOverviewContract> {
    return this.analytics.overview(query.days);
  }

  @Get('users')
  users(@Query() query: AdminListQueryDto): Promise<AdminUserListContract> {
    return this.management.users(query);
  }

  @Get('orders')
  orders(@Query() query: AdminListQueryDto): Promise<AdminOrderListContract> {
    return this.management.orders(query);
  }

  @Get('payments')
  payments(
    @Query() query: AdminListQueryDto,
  ): Promise<AdminPaymentListContract> {
    return this.management.payments(query);
  }

  @Get('products')
  products(
    @Query() query: AdminListQueryDto,
  ): Promise<AdminProductListContract> {
    return this.management.products(query);
  }

  @Get('ai-logs')
  aiLogs(@Query() query: AdminListQueryDto): Promise<AdminAiLogListContract> {
    return this.management.aiLogs(query);
  }

  @Get('ingestion/status')
  ingestionStatus(): Promise<AdminIngestionStatusContract> {
    return this.management.ingestionStatus();
  }
}
