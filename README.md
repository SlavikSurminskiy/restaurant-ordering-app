# Restaurant Ordering

Fullstack restaurant ordering app: an Nx monorepo with an Angular frontend, a NestJS backend and PostgreSQL via Prisma.

Architecture and conventions are described in [docs/architecture.md](docs/architecture.md).

## Getting started

Requirements: Node.js 24+, pnpm 11, Docker (running).

```bash
pnpm install    # dependencies + Prisma Client
pnpm env:init   # .env from .env.example (keeps an existing .env)
pnpm start      # PostgreSQL → migrations → seed → backend + frontend
```

`pnpm start` brings everything up: it starts PostgreSQL in Docker, applies migrations and runs the seed (both are safe to re-run), then serves the backend on http://localhost:3000/api and the frontend on http://localhost:4200.

Seeded users (local development only):

| Email                  | Password      | Role     |
| ---------------------- | ------------- | -------- |
| `admin@example.com`    | `admin123`    | Admin    |
| `customer@example.com` | `customer123` | Customer |

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

## Troubleshooting

`.env.example` is the committed template with local development defaults; `.env` is your git-ignored local copy. If `pnpm env:init` doesn't work, copy `.env.example` to `.env` in the project root manually. Common reasons it fails:

- **PowerShell execution policy** blocks the `pnpm.ps1` wrapper (`running scripts is disabled on this system`). Run `pnpm.cmd env:init` instead, or allow local scripts once with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **pnpm or Node.js is not installed or not on `PATH`**: the shell can't find the `pnpm` or `node` command.
- **The command runs outside the project root**: in a subfolder such as `apps/frontend`, pnpm uses that folder's `package.json`, which has no `env:init` script.
- **No write permission** in the project folder, so `.env` can't be created.

Other common issues:

- `pnpm start` fails at `database:postgres-up`: Docker is not running.
- `Port 4200 is already in use` (or 3000, 9229): a dev server from an earlier run is still alive; stop it first.
