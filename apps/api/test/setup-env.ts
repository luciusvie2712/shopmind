import 'reflect-metadata';

process.env.DATABASE_URL ??=
  'postgresql://shopmind:shopmind_local@localhost:5432/shopmind_test';
process.env.REDIS_URL ??= 'redis://localhost:6380';
process.env.JWT_ACCESS_SECRET ??= 'phase2-test-access-secret';
process.env.JWT_ACCESS_TTL ??= '15m';
process.env.REFRESH_TOKEN_TTL_DAYS ??= '7';
process.env.COOKIE_SECURE ??= 'false';
process.env.NODE_ENV ??= 'test';
