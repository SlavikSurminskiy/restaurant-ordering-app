# Development

## Commands

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm env:init`     | Create `.env` from `.env.example` if missing   |
| `pnpm start`        | PostgreSQL, migrations, seed, then dev servers |
| `pnpm build`        | Build all projects                             |
| `pnpm test`         | Run Vitest for all projects                    |
| `pnpm lint`         | Run ESLint for all projects                    |
| `pnpm format`       | Format files with Prettier                     |
| `pnpm format:check` | Check formatting                               |
| `pnpm db:up`        | Start PostgreSQL in Docker                     |
| `pnpm db:generate`  | `prisma generate`                              |
| `pnpm db:migrate`   | `prisma migrate dev`: create/apply a migration |
| `pnpm db:deploy`    | `prisma migrate deploy`                        |
| `pnpm db:reset`     | `prisma migrate reset`                         |
| `pnpm db:seed`      | `prisma db seed`                               |
| `pnpm db:studio`    | Open Prisma Studio                             |

Database commands start PostgreSQL themselves if it isn't running. For a single project: `pnpm nx <target> <project>`, e.g. `pnpm nx test frontend`.

## Configuration

`.env.example` is the committed template with local development defaults; `.env` is your git-ignored local copy. Notable variables:

| Variable                    | Default | Meaning                                                    |
| --------------------------- | ------- | ---------------------------------------------------------- |
| `ORDER_DISCOUNT`            | `500`   | Fixed discount on every order, in cents                    |
| `ORDER_STATUS_STEP_SECONDS` | `20`    | How long an order stays in a status before the timer moves |
| `JWT_TTL`                   | `28800` | Lifetime of the login token and cookie, in seconds (8 h)   |

See [architecture.md](architecture.md#environment-variables) for how the files are used.

## Troubleshooting

If `pnpm env:init` doesn't work, copy `.env.example` to `.env` in the project root manually. Common reasons it fails:

- **PowerShell execution policy** blocks the `pnpm.ps1` wrapper (`running scripts is disabled on this system`). Run `pnpm.cmd env:init` instead, or allow local scripts once with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **pnpm or Node.js is not installed or not on `PATH`**: the shell can't find the `pnpm` or `node` command.
- **The command runs outside the project root**: in a subfolder such as `apps/frontend`, pnpm uses that folder's `package.json`, which has no `env:init` script.
- **No write permission** in the project folder, so `.env` can't be created.

Other common issues:

- `pnpm start` fails at `database:postgres-up`: Docker is not running.
- `Port 4200 is already in use` (or 3000, 9229): a dev server from an earlier run is still alive; stop it first.
