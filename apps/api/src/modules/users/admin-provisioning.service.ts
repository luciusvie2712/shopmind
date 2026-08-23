import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { normalizeEmail } from '../auth/auth.utils';
import { UserRepository } from './user.repository';

export type AdminProvisioningResult = {
  readonly userId: string;
  readonly status: 'granted' | 'already_admin';
};

export class AdminProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminProvisioningError';
  }
}

@Injectable()
export class AdminProvisioningService {
  constructor(private readonly users: UserRepository) {}

  async grantByEmail(email: string): Promise<AdminProvisioningResult> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (user === null) {
      throw new AdminProvisioningError(
        'No user exists for the supplied email; register the user first',
      );
    }
    if (user.role === Role.ADMIN) {
      return { userId: user.id, status: 'already_admin' };
    }

    const updated = await this.users.updateRole(user.id, Role.ADMIN);
    return { userId: updated.id, status: 'granted' };
  }
}
