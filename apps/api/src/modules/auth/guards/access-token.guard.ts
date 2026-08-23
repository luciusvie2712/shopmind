import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import {
  AccessTokenService,
  type AuthenticatedUser,
} from '../services/access-token.service';

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.get('authorization');
    const [scheme, token, extra] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || token === undefined || extra !== undefined) {
      throw new UnauthorizedException('Authentication is required');
    }

    const user = await this.accessTokenService.verify(token);
    (request as AuthenticatedRequest).user = user;
    return true;
  }
}
