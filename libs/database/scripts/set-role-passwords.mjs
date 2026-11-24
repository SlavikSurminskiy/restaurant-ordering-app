// Sets the password of every service's database role (created by the `service_db_roles` migration)
// from the environment. Runs right after `prisma migrate deploy`: in the migrate image and in the
// local `database:prisma-roles` target. Connects as the owner, through DATABASE_URL in
// prisma.config.ts, so run it from the directory that holds prisma.config.ts.
//
// Runs on every deploy: the Secret (or .env) is the only source of the passwords, and changing a
// password there and deploying again changes it in the database.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/** Role → the variable with its password. Keep in sync with the `service_db_roles` migration. */
const ROLES = {
  auth_service: 'AUTH_SERVICE_DB_PASSWORD',
  menu_service: 'MENU_SERVICE_DB_PASSWORD',
  orders_service: 'ORDERS_SERVICE_DB_PASSWORD',
};

const missing = Object.values(ROLES).filter((name) => !process.env[name]);

if (missing.length) {
  console.error(
    `Missing ${missing.join(', ')}: set them in .env locally (see .env.example) or in the Secret db-roles.`,
  );
  process.exit(1);
}

// A SQL string literal: quotes doubled. Postgres hashes the password itself (SCRAM-SHA-256), and
// the statement is not logged with the default log_statement = none.
const literal = (value) => `'${value.replaceAll("'", "''")}'`;

const sql = Object.entries(ROLES)
  .map(
    ([role, name]) =>
      `ALTER ROLE "${role}" WITH PASSWORD ${literal(process.env[name])};`,
  )
  .join('\n');

// The Prisma CLI is already here (migrate image, monorepo), so no Postgres client is added for this.
const prisma = createRequire(import.meta.url).resolve('prisma/build/index.js');
const result = spawnSync(
  process.execPath,
  [prisma, 'db', 'execute', '--stdin'],
  {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
  },
);

// Set when the process did not start at all (status is then null).
if (result.error) {
  console.error(result.error);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Passwords set for ${Object.keys(ROLES).join(', ')}.`);
