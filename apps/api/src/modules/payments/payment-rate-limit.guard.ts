import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { RedisService } from '../../common/redis/redis.service';
@Injectable()
export class PaymentRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = createHash('sha256').update(request.user.id).digest('hex');
    try {
      const result = await this.redis.incrementFixedWindow(
        `shopmind:rate-limit:payments:v1:${key}`,
        60,
      );
      if (result.count > 10)
        throw new HttpException(
          'Too many payment requests',
          HttpStatus.TOO_MANY_REQUESTS,
        );
    } catch (error) {
      if (error instanceof HttpException) throw error;
    }
    return true;
  }
}
