import type { CreateUserEventContract } from '@shopmind/contracts';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RequestWithId } from '../../common/http/request-context.middleware';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import type { AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { CreateUserEventDto } from './dto/create-user-event.dto';
import { EventsRateLimitService } from './events-rate-limit.service';
import { EventsService } from './events.service';

type EventRequest = Request &
  Partial<AuthenticatedRequest> &
  Partial<RequestWithId>;

@Controller('events')
@UseGuards(OptionalAccessTokenGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly rateLimit: EventsRateLimitService,
  ) {}

  @Post()
  async record(
    @Body() input: CreateUserEventDto,
    @Req() request: EventRequest,
  ): Promise<CreateUserEventContract> {
    const identity = request.user?.id ?? request.ip ?? 'unknown';
    if (!(await this.rateLimit.isAllowed(identity))) {
      throw new HttpException(
        'Too many event requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.eventsService.record(input, {
      ...(request.user === undefined ? {} : { userId: request.user.id }),
      ...(request.requestId === undefined
        ? {}
        : { requestId: request.requestId }),
    });
  }
}
