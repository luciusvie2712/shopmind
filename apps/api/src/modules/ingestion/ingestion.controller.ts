import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { QueueService } from '../../common/queue/queue.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { type AuthenticatedUser } from '../auth/services/access-token.service';

@Controller('admin/ingestion')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(private readonly queueService: QueueService) {}

  @Post('products')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(Role.ADMIN)
  @UseGuards(AccessTokenGuard, RolesGuard)
  async importProducts(@CurrentUser() user: AuthenticatedUser): Promise<{
    readonly jobId: string;
    readonly status: 'queued';
  }> {
    const { jobId } = await this.queueService.enqueueSyncProducts();
    this.logger.log({
      operation: 'trigger_product_import',
      source: 'admin_api',
      userId: user.id,
      jobId,
      status: 'queued',
    });
    return { jobId, status: 'queued' };
  }
}
