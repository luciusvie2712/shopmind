import type {
  AiCompareContract,
  AiSearchContract,
  AssistantTurnContract,
} from '@shopmind/contracts';
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../common/http/request-context.middleware';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AiRateLimitGuard } from '../../common/rate-limit/ai-rate-limit.guard';
import type { AuthenticatedUser } from '../auth/services/access-token.service';
import { AssistantService } from './assistant.service';
import { AiSearchService } from './ai-search.service';
import { CompareService } from './compare.service';
import { AssistantMessageDto } from './dto/assistant-message.dto';
import { AiSearchDto } from './dto/ai-search.dto';
import { CompareProductsDto } from './dto/compare-products.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiSearchService: AiSearchService,
    private readonly assistantService: AssistantService,
    private readonly compareService: CompareService,
  ) {}

  @Post('search')
  @UseGuards(AiRateLimitGuard)
  search(
    @Body() input: AiSearchDto,
    @Req() request: RequestWithId,
  ): Promise<AiSearchContract> {
    return this.aiSearchService.search(input, request.requestId);
  }

  @Post('assistant/messages')
  @UseGuards(AccessTokenGuard, AiRateLimitGuard)
  assistantMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AssistantMessageDto,
    @Req() request: RequestWithId,
  ): Promise<AssistantTurnContract> {
    return this.assistantService.sendMessage(user.id, input, request.requestId);
  }

  @Post('compare')
  @UseGuards(AiRateLimitGuard)
  compare(
    @Body() input: CompareProductsDto,
    @Req() request: RequestWithId,
  ): Promise<AiCompareContract> {
    return this.compareService.compare(input, request.requestId);
  }
}
