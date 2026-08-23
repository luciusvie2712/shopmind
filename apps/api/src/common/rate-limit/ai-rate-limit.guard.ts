import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiException } from '../errors/api.exception';
import { ERROR_CODES } from '../errors/error-code';
import type { AuthenticatedRequest } from '../../modules/auth/guards/access-token.guard';
import { AiRateLimitService } from './ai-rate-limit.service';

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimits: AiRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Partial<AuthenticatedRequest>>();
    const response = http.getResponse<Response>();
    const identity =
      request.user === undefined
        ? `ip:${request.ip ?? 'unknown'}`
        : `user:${request.user.id}`;
    const decision = await this.rateLimits.consume(identity);
    if (!decision.allowed) {
      response.setHeader('Retry-After', decision.retryAfterSeconds);
      throw new ApiException(
        ERROR_CODES.AI_RATE_LIMITED,
        'AI request limit exceeded; retry later',
      );
    }
    return true;
  }
}
