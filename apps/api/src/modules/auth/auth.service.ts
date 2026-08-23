import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, type User } from '@prisma/client';
import { type PublicUser, UserRepository } from '../users/user.repository';
import { normalizeEmail } from './auth.utils';
import { type LoginDto } from './dto/login.dto';
import { type RegisterDto } from './dto/register.dto';
import { AccessTokenService } from './services/access-token.service';
import { PasswordHasherService } from './services/password-hasher.service';
import {
  type RefreshCredential,
  RefreshSessionService,
} from './services/refresh-session.service';

export interface LoginResult {
  readonly accessToken: string;
  readonly user: PublicUser;
  readonly refreshCredential: RefreshCredential;
}

export interface RefreshResult {
  readonly accessToken: string;
  readonly user: PublicUser;
  readonly refreshCredential: RefreshCredential;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshSessions: RefreshSessionService,
  ) {}

  async register(input: RegisterDto): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);

    if (existing !== null) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    try {
      const user = await this.users.create({
        email,
        passwordHash,
        name: input.name.trim(),
        role: Role.USER,
      });
      return this.toPublicUser(user);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Email is already registered');
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<LoginResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    const validPassword =
      user !== null &&
      (await this.passwordHasher.verify(user.passwordHash, input.password));

    if (!validPassword || user === null) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const [accessToken, refreshCredential] = await Promise.all([
      this.accessTokens.sign({ id: user.id, role: user.role }),
      this.refreshSessions.issue(user.id),
    ]);

    return {
      accessToken,
      user: this.toPublicUser(user),
      refreshCredential,
    };
  }

  async refresh(token: string | undefined): Promise<RefreshResult> {
    if (token === undefined) {
      throw new UnauthorizedException('Refresh credential is required');
    }

    const rotated = await this.refreshSessions.rotate(token);

    if (rotated === null) {
      throw new UnauthorizedException('Refresh credential is invalid');
    }

    const accessToken = await this.accessTokens.sign({
      id: rotated.user.id,
      role: rotated.user.role,
    });

    return {
      accessToken,
      user: rotated.user,
      refreshCredential: {
        token: rotated.token,
        expiresAt: rotated.expiresAt,
      },
    };
  }

  async logout(token: string | undefined, userId: string): Promise<void> {
    if (token === undefined) {
      throw new UnauthorizedException('Refresh credential is required');
    }

    const revoked = await this.refreshSessions.revoke(token, userId);
    if (!revoked) {
      throw new UnauthorizedException('Refresh credential is invalid');
    }
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
