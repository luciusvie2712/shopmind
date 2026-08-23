import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function createContext(role: Role | undefined): ExecutionContext {
    return {
      getHandler: () => RolesGuard,
      getClass: () => RolesGuard,
      switchToHttp: () => ({
        getRequest: () =>
          role === undefined ? {} : { user: { id: 'user-id', role } },
      }),
    } as unknown as ExecutionContext;
  }

  it('allows an authenticated user with a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(Role.ADMIN))).toBe(true);
  });

  it('rejects an authenticated user without a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(Role.USER))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a missing authenticated user', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
