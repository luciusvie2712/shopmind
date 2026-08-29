import type {
  AiCompareContract,
  AiSearchContract,
  AssistantTurnContract,
} from '@shopmind/contracts';
import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
import { AssistantStreamService } from './assistant-stream.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiSearchService: AiSearchService,
    private readonly assistantService: AssistantService,
    private readonly compareService: CompareService,
    private readonly assistantStream: AssistantStreamService,
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

  @Post('assistant/stream')
  @UseGuards(AccessTokenGuard, AiRateLimitGuard)
  async streamAssistant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AssistantMessageDto,
    @Req() request: RequestWithId,
    @Res() response: Response,
  ): Promise<void> {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    try {
      for await (const event of this.assistantStream.stream(
        user.id,
        input,
        request.requestId,
      )) {
        if (response.destroyed) return;
        response.write(
          `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        );
      }
    } catch {
      if (!response.destroyed) {
        response.write(
          `event: error\ndata: ${JSON.stringify({ type: 'error', code: 'INTERNAL_ERROR', message: 'Assistant stream failed' })}\n\n`,
        );
      }
    } finally {
      if (!response.destroyed) response.end();
    }
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
