import type { RecommendationsContract } from '@shopmind/contracts';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../auth/services/access-token.service';
import { ListRecommendationsDto } from './dto/list-recommendations.dto';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
@UseGuards(AccessTokenGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRecommendationsDto,
  ): Promise<RecommendationsContract> {
    return this.recommendations.list(user.id, query);
  }
}
