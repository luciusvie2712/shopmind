import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { type PublicUser } from '../../users/user.repository';

export interface RotatedRefreshSession {
  readonly user: PublicUser;
}

@Injectable()
export class RefreshSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.refreshSession.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async rotate(
    tokenHash: string,
    nextTokenHash: string,
    nextExpiresAt: Date,
    now: Date,
  ): Promise<RotatedRefreshSession | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.refreshSession.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      if (
        current === null ||
        current.revokedAt !== null ||
        current.expiresAt <= now
      ) {
        return null;
      }

      const revoked = await transaction.refreshSession.updateMany({
        where: { id: current.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        return null;
      }

      await transaction.refreshSession.create({
        data: {
          userId: current.userId,
          tokenHash: nextTokenHash,
          expiresAt: nextExpiresAt,
        },
      });

      return { user: current.user };
    });
  }

  async revoke(tokenHash: string, userId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash,
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });

    return result.count === 1;
  }
}
