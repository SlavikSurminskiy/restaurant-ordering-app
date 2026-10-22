# Restaurant Ordering

Fullstack restaurant ordering app: an Nx monorepo with an Angular frontend, a NestJS backend and PostgreSQL via Prisma.

Architecture and conventions are described in [docs/architecture.md](docs/architecture.md).

## Getting started

Requirements: Node.js 24+, pnpm 11, Docker.

```bash
pnpm install                 # also generates the Prisma Client (postinstall)
pnpm env:init                # creates .env from .env.example (keeps an existing .env)
docker compose up -d --wait  # PostgreSQL, waits for the healthcheck
pnpm start                   # backend (http://localhost:3000/api) + frontend (http://localhost:4200)
```

`.env.example` is the committed template with local development defaults. `.env` is your git-ignored local copy.

If `pnpm env:init` doesn't work in your shell, copy the file manually: duplicate `.env.example` in the project root and rename the copy to `.env`.

Common reasons it fails:

- **PowerShell execution policy** blocks the `pnpm.ps1` wrapper (`running scripts is disabled on this system`). Run `pnpm.cmd env:init` instead, or allow local scripts once with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **pnpm or Node.js is not installed or not on `PATH`**: the shell can't find the `pnpm` or `node` command.
- **The command runs outside the project root**: in a subfolder such as `apps/frontend`, pnpm uses that folder's `package.json`, which has no `env:init` script.
- **No write permission** in the project folder, so `.env` can't be created.

## Commands

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm env:init`     | Create `.env` from `.env.example` if missing   |
| `pnpm start`        | Run frontend and backend dev servers           |
| `pnpm build`        | Build all projects                             |
| `pnpm test`         | Run Vitest for all projects                    |
| `pnpm lint`         | Run ESLint for all projects                    |
| `pnpm format`       | Format files with Prettier                     |
| `pnpm format:check` | Check formatting                               |
| `pnpm db:generate`  | `prisma generate`                              |
| `pnpm db:migrate`   | `prisma migrate dev`: create/apply a migration |
| `pnpm db:deploy`    | `prisma migrate deploy`                        |
| `pnpm db:reset`     | `prisma migrate reset`                         |
| `pnpm db:seed`      | `prisma db seed`                               |
| `pnpm db:studio`    | Open Prisma Studio                             |

For a single project: `pnpm nx <target> <project>`, e.g. `pnpm nx test frontend`.
