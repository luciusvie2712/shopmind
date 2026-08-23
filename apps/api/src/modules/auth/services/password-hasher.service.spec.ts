import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  const passwordHasher = new PasswordHasherService();

  it('hashes with Argon2id and verifies the matching password', async () => {
    const passwordHash = await passwordHasher.hash('correct horse battery');

    expect(passwordHash.startsWith('$argon2id$')).toBe(true);
    await expect(
      passwordHasher.verify(passwordHash, 'correct horse battery'),
    ).resolves.toBe(true);
    await expect(
      passwordHasher.verify(passwordHash, 'incorrect password'),
    ).resolves.toBe(false);
  });
});
