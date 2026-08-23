import { SetMetadata } from '@nestjs/common';
import { type Role } from '@prisma/client';

export const ROLES_METADATA_KEY = 'shopmind:roles';

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);
