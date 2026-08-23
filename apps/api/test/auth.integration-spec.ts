import {
  Controller,
  Get,
  type INestApplication,
  type LoggerService,
  Module,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request, { type Response as TestResponse } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import { Roles } from '../src/modules/auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../src/modules/auth/guards/access-token.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AuthModule } from '../src/modules/auth/auth.module';

@Controller('test')
class AuthorizationProbeController {
  @Get('admin')
  @Roles(Role.ADMIN)
  @UseGuards(AccessTokenGuard, RolesGuard)
  adminOnly(): { readonly ok: true } {
    return { ok: true };
  }

  @Get('failure')
  fail(): never {
    throw new Error('sensitive-stack-marker');
  }
}

@Module({
  imports: [AppModule, AuthModule],
  controllers: [AuthorizationProbeController],
})
class IntegrationTestModule {}

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

function getRefreshCookie(response: TestResponse): string {
  const header: unknown = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : [header];
  const refreshCookie = cookies.find(
    (value): value is string =>
      typeof value === 'string' && value.startsWith('shopmind_refresh='),
  );

  if (refreshCookie === undefined) {
    throw new Error('Refresh cookie was not set');
  }

  return refreshCookie.split(';', 1)[0];
}

describe('Phase 2 API integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [IntegrationTestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.refreshSession.deleteMany({
      where: { user: { email: { endsWith: '@phase2.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@phase2.test' } },
    });
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  it('registers, rotates refresh credentials, and revokes logout', async () => {
    const registration = {
      name: 'Phase Two User',
      email: 'Phase2.User@phase2.test',
      password: 'phase-two-password',
    };

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(201);
    expect(registered.body).toMatchObject({
      email: 'phase2.user@phase2.test',
      name: registration.name,
      role: Role.USER,
    });
    expect(registered.body).not.toHaveProperty('passwordHash');

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(400);
    expect(duplicate.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(duplicate.body.error.requestId).toEqual(expect.any(String));

    const invalidLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: registration.email, password: 'wrong-password' })
      .expect(401);
    expect(invalidLogin.body.error).toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(JSON.stringify(invalidLogin.body)).not.toContain(registration.email);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: registration.email, password: registration.password })
      .expect(200);
    const accessToken: unknown = login.body.accessToken;
    expect(accessToken).toEqual(expect.any(String));
    expect(login.body.user).not.toHaveProperty('passwordHash');
    const firstCookie = getRefreshCookie(login);
    const setCookieHeader = String(login.headers['set-cookie']);
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=Lax');

    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/test/admin')
      .set('Authorization', `Bearer ${String(accessToken)}`)
      .expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
    expect(forbidden.body.error.requestId).toEqual(expect.any(String));

    const firstRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(200);
    const secondCookie = getRefreshCookie(firstRefresh);
    expect(secondCookie).not.toBe(firstCookie);

    const reused = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(401);
    expect(reused.body.error.code).toBe('AUTH_REQUIRED');

    const secondRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', secondCookie)
      .expect(200);
    const thirdCookie = getRefreshCookie(secondRefresh);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${String(accessToken)}`)
      .set('Cookie', thirdCookie)
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', thirdCookie)
      .expect(401);
  });

  it('returns stable validation and authentication errors', async () => {
    const validation = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'invalid', password: 'short', role: Role.ADMIN })
      .expect(400);
    expect(validation.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: expect.any(String),
    });

    const authentication = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(401);
    expect(authentication.body.error).toMatchObject({
      code: 'AUTH_REQUIRED',
      requestId: expect.any(String),
    });

    const internal = await request(app.getHttpServer())
      .get('/api/v1/test/failure')
      .expect(500);
    expect(internal.body.error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: expect.any(String),
    });
    expect(JSON.stringify(internal.body)).not.toContain('sensitive-stack-marker');
    expect(internal.body).not.toHaveProperty('stack');
  });

  it('rejects an expired refresh session', async () => {
    const registration = {
      name: 'Expired Session User',
      email: 'expired.session@phase2.test',
      password: 'expired-session-password',
    };
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: registration.email, password: registration.password })
      .expect(200);
    const refreshCookie = getRefreshCookie(login);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: registration.email },
    });
    await prisma.refreshSession.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(0) },
    });

    const expired = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
    expect(expired.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('reports database and Redis readiness without leaking secrets', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('DATABASE_URL');
    expect(serialized).not.toContain('REDIS_URL');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('secret');
  });
});
