import { Injectable } from '@nestjs/common';
import { type Role, type User } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

export type PublicUser = Pick<
  User,
  'id' | 'email' | 'name' | 'role' | 'createdAt'
>;

export interface CreateUserInput {
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string;
  readonly role?: Role;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  updateRole(userId: string, role: Role): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role,
      },
    });
  }
}
