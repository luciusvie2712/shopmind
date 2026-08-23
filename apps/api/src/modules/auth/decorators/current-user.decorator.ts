import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AuthenticatedRequest } from '../guards/access-token.guard';
import { type AuthenticatedUser } from '../services/access-token.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
