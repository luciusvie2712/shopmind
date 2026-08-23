import { type Response } from 'express';
import { config } from '../../common/config';

export const REFRESH_COOKIE_NAME = 'shopmind_refresh';

export function isRefreshCookieSecure(
  nodeEnv: 'development' | 'test' | 'production',
  configuredSecure: boolean,
): boolean {
  return nodeEnv === 'production' || configuredSecure;
}

const refreshCookieOptions = {
  httpOnly: true,
  secure: isRefreshCookieSecure(config.nodeEnv, config.auth.cookieSecure),
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
};

export function setRefreshCookie(
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}
