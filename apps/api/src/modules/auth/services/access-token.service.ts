import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { config } from '../../../common/config';

export interface AuthenticatedUser {
  readonly id: string;
  readonly role: Role;
}

interface AccessTokenPayload {
  readonly sub: string;
  readonly role: Role;
}

@Injectable()
export class AccessTokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(user: AuthenticatedUser): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };

    return this.jwtService.signAsync(payload, {
      secret: config.auth.accessSecret,
      expiresIn: config.auth.accessTtl as JwtSignOptions['expiresIn'],
    });
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        { secret: config.auth.accessSecret },
      );

      if (
        typeof payload.sub !== 'string' ||
        !Object.values(Role).includes(payload.role)
      ) {
        throw new UnauthorizedException();
      }

      return { id: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedException('Authentication is required');
    }
  }
}
