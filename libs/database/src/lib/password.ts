import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const KEY_LENGTH = 64;

/** Hash format: `<salt hex>:<scrypt hash hex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);

  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [saltHex, hashHex] = passwordHash.split(':');

  if (!saltHex || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');

  // A non-hex hash part decodes to fewer bytes (even zero, and two empty
  // buffers compare equal), so a damaged hash would accept any password.
  if (expected.length !== KEY_LENGTH) {
    return false;
  }

  const actual = await scryptAsync(
    password,
    Buffer.from(saltHex, 'hex'),
    KEY_LENGTH,
  );

  // Constant time, so the response time doesn't leak how much matched.
  return timingSafeEqual(actual, expected);
}

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;
