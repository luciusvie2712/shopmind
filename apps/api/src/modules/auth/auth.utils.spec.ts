import { normalizeEmail } from './auth.utils';

describe('normalizeEmail', () => {
  it('trims and lowercases an email address', () => {
    expect(normalizeEmail('  User.Name@Example.COM ')).toBe(
      'user.name@example.com',
    );
  });
});
