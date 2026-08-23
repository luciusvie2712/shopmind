import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { config } from '../../../common/config';
import { type PublicUser } from '../../users/user.repository';
import { RefreshSessionRepository } from '../repositories/refresh-session.repository';

export interface RefreshCredential {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface RotatedRefreshCredential extends RefreshCredential {
  readonly user: PublicUser;
}

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly refreshSessionRepository: RefreshSessionRepository,
  ) {}

  async issue(userId: string): Promise<RefreshCredential> {
    const credential = this.createCredential();
    await this.refreshSessionRepository.create(
      userId,
      this.hashToken(credential.token),
      credential.expiresAt,
    );
    return credential;
  }

  async rotate(token: string): Promise<RotatedRefreshCredential | null> {
    const nextCredential = this.createCredential();
    const rotated = await this.refreshSessionRepository.rotate(
      this.hashToken(token),
      this.hashToken(nextCredential.token),
      nextCredential.expiresAt,
      new Date(),
    );

    if (rotated === null) {
      return null;
    }

    return {
      ...nextCredential,
      user: rotated.user,
    };
  }

  revoke(token: string, userId: string): Promise<boolean> {
    return this.refreshSessionRepository.revoke(
      this.hashToken(token),
      userId,
      new Date(),
    );
  }

  private createCredential(): RefreshCredential {
    const expiresAt = new Date();
    expiresAt.setUTCDate(
      expiresAt.getUTCDate() + config.auth.refreshTokenTtlDays,
    );

    return {
      token: randomBytes(48).toString('base64url'),
      expiresAt,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
