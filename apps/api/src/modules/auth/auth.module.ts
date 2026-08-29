import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { OptionalAccessTokenGuard } from './guards/optional-access-token.guard';
import { RolesGuard } from './guards/roles.guard';
import { RefreshSessionRepository } from './repositories/refresh-session.repository';
import { AccessTokenService } from './services/access-token.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { RefreshSessionService } from './services/refresh-session.service';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenGuard,
    OptionalAccessTokenGuard,
    RolesGuard,
    RefreshSessionRepository,
    AccessTokenService,
    PasswordHasherService,
    RefreshSessionService,
  ],
  exports: [
    AccessTokenGuard,
    OptionalAccessTokenGuard,
    RolesGuard,
    AccessTokenService,
  ],
})
export class AuthModule {}
