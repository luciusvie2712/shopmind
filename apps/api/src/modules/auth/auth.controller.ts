import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from './auth-cookie';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { type AuthenticatedUser } from './services/access-token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() input: RegisterDto) {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(input);
    setRefreshCookie(
      response,
      result.refreshCredential.token,
      result.refreshCredential.expiresAt,
    );

    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      this.readRefreshCookie(request),
    );
    setRefreshCookie(
      response,
      result.refreshCredential.token,
      result.refreshCredential.expiresAt,
    );
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AccessTokenGuard)
  async logout(
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(this.readRefreshCookie(request), user.id);
    clearRefreshCookie(response);
  }

  private readRefreshCookie(request: Request): string | undefined {
    const cookies: unknown = (request as unknown as { cookies?: unknown })
      .cookies;
    if (typeof cookies !== 'object' || cookies === null) {
      return undefined;
    }

    const value = (cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
    return typeof value === 'string' ? value : undefined;
  }
}
