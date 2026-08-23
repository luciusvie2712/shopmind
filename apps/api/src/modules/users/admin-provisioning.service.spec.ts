import { Role, type User } from '@prisma/client';
import {
  AdminProvisioningError,
  AdminProvisioningService,
} from './admin-provisioning.service';
import { type UserRepository } from './user.repository';

const baseUser: User = {
  id: '204cbcd5-650d-4b3a-bc1d-a61bce588281',
  email: 'operator@example.com',
  passwordHash: 'not-used-by-this-test',
  name: 'Operator',
  role: Role.USER,
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
};

describe('AdminProvisioningService', () => {
  function setup(user: User | null) {
    const findByEmail: jest.MockedFunction<UserRepository['findByEmail']> =
      jest.fn();
    const updateRole: jest.MockedFunction<UserRepository['updateRole']> =
      jest.fn();
    findByEmail.mockResolvedValue(user);
    updateRole.mockResolvedValue({ ...baseUser, role: Role.ADMIN });
    const users: Pick<UserRepository, 'findByEmail' | 'updateRole'> = {
      findByEmail,
      updateRole,
    };
    return {
      service: new AdminProvisioningService(users as UserRepository),
      users,
    };
  }

  it('normalizes the email and grants ADMIN to an existing user', async () => {
    const { service, users } = setup(baseUser);

    await expect(
      service.grantByEmail(' Operator@Example.COM '),
    ).resolves.toEqual({ userId: baseUser.id, status: 'granted' });
    expect(users.findByEmail).toHaveBeenCalledWith('operator@example.com');
    expect(users.updateRole).toHaveBeenCalledWith(baseUser.id, Role.ADMIN);
  });

  it('is idempotent when the user is already ADMIN', async () => {
    const { service, users } = setup({ ...baseUser, role: Role.ADMIN });

    await expect(service.grantByEmail(baseUser.email)).resolves.toEqual({
      userId: baseUser.id,
      status: 'already_admin',
    });
    expect(users.updateRole).not.toHaveBeenCalled();
  });

  it('rejects an unknown user without creating an account', async () => {
    const { service, users } = setup(null);

    await expect(
      service.grantByEmail('missing@example.com'),
    ).rejects.toBeInstanceOf(AdminProvisioningError);
    expect(users.updateRole).not.toHaveBeenCalled();
  });
});
