import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);

  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;
