import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { type AuthenticatedRequest } from './access-token.guard';
import { AccessTokenService } from '../services/access-token.service';

@Injectable()
export class OptionalAccessTokenGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.get('authorization');
    if (authorization === undefined) return true;

    const [scheme, token, extra] = authorization.split(' ');
    if (scheme !== 'Bearer' || token === undefined || extra !== undefined) {
      throw new UnauthorizedException('Authentication token is invalid');
    }
    (request as AuthenticatedRequest).user =
      await this.accessTokenService.verify(token);
    return true;
  }
}
