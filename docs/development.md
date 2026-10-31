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

Database commands start PostgreSQL themselves if it isn't running. For a single project: `pnpm nx <target> <project>`, e.g. `pnpm nx test frontend`. `pnpm nx run backend:prepare-deploy` builds the backend into `dist/apps/backend` ready to install outside the monorepo ([details](architecture.md#deploy-output)).

## Docker images

All images build from the repository root:

```bash
docker build -f apps/backend/Dockerfile -t restaurant-backend .
docker build -f apps/frontend/Dockerfile -t restaurant-frontend .
docker build -f libs/database/Dockerfile -t restaurant-migrate .
```

- **Migrate** runs `prisma migrate deploy` against `DATABASE_URL` and exits: 0 when the database is up to date, non-zero on failure, so the backend can start only after it succeeds. Run it before every backend release. It holds the Prisma CLI (at the root `package.json` version) with the schema and migrations; it does not seed.
- **Backend** listens on 3000 and needs `DATABASE_URL` and `JWT_SECRET` (at least 32 characters, because the image sets `NODE_ENV=production`). It does not run migrations.
- **Frontend** is nginx on 8080 (non-root). It serves the Angular build, falls back to `index.html` for client-side routes and proxies `/api` to `BACKEND_URL` (default `http://backend:3000`), without buffering `/api/events`. The config is `apps/frontend/nginx.conf.template`.

### Production-like stack

`docker-compose.prod.yml` builds the images and runs Postgres → migrate → backend → frontend on http://localhost:8080. It is a separate compose project (`restaurant-prod`) with its own volume, so it does not touch the development database:

```bash
cp .env.prod.example .env.prod      # git-ignored; set POSTGRES_PASSWORD and a 32+ character JWT_SECRET
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod down    # add -v to delete the data
```

- Always pass `--env-file .env.prod`: without it Compose reads the development `.env`, whose `JWT_SECRET` is too short for `NODE_ENV=production`.
- The backend starts only after `migrate` exits with 0, and the frontend only after the backend's `/api/health` answers.
- `POSTGRES_*` initialise the volume on its first start only. Changing `POSTGRES_PASSWORD` later does not change the database password, so `migrate` fails with `P1000` and the backend does not start.
- The database starts empty. To log in locally, seed it from the host through the port bound to `127.0.0.1` (demo users, local use only):

  ```bash
  set -a; . ./.env.prod; set +a
  DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB" \
    pnpm nx run database:prisma-seed --excludeTaskDependencies
  ```

  A variable set in the shell wins over the root `.env` that Nx loads; `--excludeTaskDependencies` skips `postgres-up` and `prisma-migrate-deploy`, which target the development database.

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
