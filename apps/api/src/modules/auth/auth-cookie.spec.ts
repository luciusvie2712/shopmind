import { isRefreshCookieSecure } from './auth-cookie';

describe('isRefreshCookieSecure', () => {
  it('always enables Secure cookies in production', () => {
    expect(isRefreshCookieSecure('production', false)).toBe(true);
  });

  it('uses the explicit setting outside production', () => {
    expect(isRefreshCookieSecure('development', false)).toBe(false);
    expect(isRefreshCookieSecure('test', true)).toBe(true);
  });
});
