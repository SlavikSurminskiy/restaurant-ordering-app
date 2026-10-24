import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('should verify the password it hashed', async () => {
    const passwordHash = await hashPassword('admin123');

    await expect(verifyPassword('admin123', passwordHash)).resolves.toBe(true);
  });

  it('should reject a wrong password', async () => {
    const passwordHash = await hashPassword('admin123');

    await expect(verifyPassword('admin124', passwordHash)).resolves.toBe(false);
  });

  it('should salt every hash', async () => {
    const first = await hashPassword('admin123');
    const second = await hashPassword('admin123');

    expect(first).not.toBe(second);
  });

  it('should reject a hash whose hash part is not hex', async () => {
    await expect(verifyPassword('anything', 'ab:zz')).resolves.toBe(false);
  });

  it('should reject a malformed hash', async () => {
    await expect(verifyPassword('admin123', 'not-a-hash')).resolves.toBe(false);
  });
});
