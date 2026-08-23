import { Module } from '@nestjs/common';
import { AdminProvisioningService } from './admin-provisioning.service';
import { UserRepository } from './user.repository';

@Module({
  providers: [AdminProvisioningService, UserRepository],
  exports: [AdminProvisioningService, UserRepository],
})
export class UsersModule {}
