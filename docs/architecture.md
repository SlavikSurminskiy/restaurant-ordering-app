# Architecture and conventions

## Project structure

```
apps/
  frontend/      Angular: standalone, signals, zoneless, OnPush, Material + CDK, NgRx SignalStore
  backend/       NestJS: REST, @Sse(), Guards, EventBus (in-memory, RxJS)
libs/
  shared/
    api-types/   API types shared by frontend and backend: DTOs, contracts, event payloads
  database/      Prisma schema, migrations, PrismaService, seed — backend only
docker-compose.yml   PostgreSQL
```

```
apps/frontend ──REST + SSE──► apps/backend
apps/frontend ──► libs/shared/api-types ◄── apps/backend
apps/backend  ──► libs/database ──Prisma Client──► PostgreSQL
```

| Project            | Directory               | Import path                    |
| ------------------ | ----------------------- | ------------------------------ |
| `frontend`         | `apps/frontend`         | —                              |
| `backend`          | `apps/backend`          | —                              |
| `shared-api-types` | `libs/shared/api-types` | `@restaurant/shared-api-types` |
| `database`         | `libs/database`         | `@restaurant/database`         |

`pnpm start` runs `nx serve frontend`. That task first starts `backend:serve`, which builds the backend (generating the Prisma Client) and runs `database:prisma-seed`. The seed depends on `prisma-migrate-deploy`, which depends on `postgres-up` (`docker compose up -d --wait`). So one command starts PostgreSQL, applies migrations, seeds the database and only then starts the servers. Every database target that needs a running database (`prisma-migrate`, `prisma-migrate-deploy`, `prisma-reset`, `prisma-studio`) also depends on `postgres-up`.

## Module boundaries

Project tags are enforced by the `@nx/enforce-module-boundaries` rule in `eslint.config.mjs`:

| Tag              | Projects              | May import                       |
| ---------------- | --------------------- | -------------------------------- |
| `scope:frontend` | `frontend`            | `scope:frontend`, `scope:shared` |
| `scope:backend`  | `backend`, `database` | `scope:backend`, `scope:shared`  |
| `scope:shared`   | `shared-api-types`    | `scope:shared`                   |

The frontend cannot import `@restaurant/database`: lint fails if it does. Prisma models never go into `libs/shared/api-types`, so the frontend depends only on the API contract, not on the database schema.

## Real-time events (SSE)

`GET /api/events` is a Server-Sent Events stream (`apps/backend/src/app/events/`):

- `EventBus` is an in-memory RxJS `Subject`, provided by the global `EventsModule`. Feature services inject it and call `publish(event)` only after a successful write.
- Clients receive events in the order they were published: `publish()` is synchronous, and each client has one ordered stream. So publish synchronously after the transaction commits and before returning the response, never before the commit or in the background. Combined with foreign keys (a dish needs a committed category; a category with dishes can't be deleted), this guarantees that `menu.category.upserted` arrives before the dishes of that category, and `menu.dish.deleted` before `menu.category.deleted`. When one request changes several entities, publish parents before children.
- Events are not stored: a client gets only events published while it is connected. So a client opens the stream first and buffers events, then loads the snapshot (`GET /api/menu`, `GET /api/orders`), then applies the buffer on top; it repeats this after every reconnect. On the frontend `SnapshotSyncService` (`core/realtime`) does this for both stores. Events carry no version, so this order is what keeps an older snapshot from overwriting a newer event.
- Event payloads are the `ServerEvent` union in `libs/shared/api-types/src/lib/events.ts`, discriminated by `type`; the type names live in the `MenuEventType` enum (`menu.category.upserted`, `menu.dish.deleted`, …), so code never spells them as strings. Each is sent as the `data` of a default `message` event, so the client needs one `onmessage` handler. `*.upserted` events carry the full entity, not a diff.
- Every 20 s the stream sends an SSE comment (`: heartbeat`), which `EventSource` ignores. It keeps idle connections from being dropped by proxies; the Angular dev proxy passes the stream through without buffering.
- On shutdown `EventBus` completes, which ends open streams, and the backend is created with `forceCloseConnections`, so `app.close()` doesn't wait for keep-alive sockets of connected clients.
- `menu.*` events are published by the admin menu endpoints (`apps/backend/src/app/menu/categories/`, `dishes/`) and go to every client. `order.*` events are published by `apps/backend/src/app/orders/` and go only to the order's owner and to admins. `EventsService` does this filtering with a `switch` over every event type, so a new type does not compile until it is handled; the stream reads the auth cookie once on connect, which is why clients reconnect after login and logout.

## Environment variables

| File           | In git  | Purpose                                                                                                          |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `.env.example` | yes     | Template: every variable with local development defaults, no secrets                                             |
| `.env`         | ignored | Your local copy; read by docker compose, Nx (automatically for every task), Prisma CLI and NestJS `ConfigModule` |

- When you add a variable, add it to `.env.example` too.
- Real secrets never go into files in the repository. Deployed environments get their variables from the platform (Docker, CI secrets), not from `.env` files; `ConfigModule` reads `.env` only if it exists.
- The Postgres image applies `POSTGRES_*` only when it initializes an empty volume. After changing them, update `DATABASE_URL` and recreate the volume (`docker compose down -v` deletes all database data).
- The backend port variable is `BACKEND_PORT`, not `PORT`: Nx passes `.env` to every task, so the Angular dev server would pick up `PORT` as well.

## Prisma

- Run the Prisma CLI only through `pnpm db:*` (that is, through Nx), not as `prisma ...` directly. Prisma 7 does not read `.env` on its own: `prisma.config.ts` takes `DATABASE_URL` from the environment, and Nx provides it.
- `pnpm db:seed` runs `libs/database/src/seed/seed.ts` (data in `users.ts` and `menu.ts` next to it). It upserts the two local users and creates the menu only when the database has no categories, so it is safe to re-run and does not overwrite admin changes. For a clean start run `pnpm db:reset` (drops all data and reapplies migrations; Prisma 7 does not seed automatically), then `pnpm db:seed`.
- Migrations generated by Prisma are never edited by hand. Workflow: change `schema.prisma` → `pnpm db:migrate --name <change>` → commit the schema with the generated migration. Things Prisma cannot model (CHECK constraints, partial indexes) go into a separate migration created empty with `pnpm db:migrate --create-only --name <change>`, written by hand, starting with a `-- Hand-written` comment, and committed separately. Editing an already applied migration changes its checksum and breaks `migrate dev` for everyone who applied it.
- Schema conventions: every model has `@@map` to a plural snake_case table (`users`, `order_items`).
- The `prisma-generate` target sets its own mock `DATABASE_URL` (in `libs/database/project.json`). Generation never connects to the database, but `env('DATABASE_URL')` requires the variable to be set. With the mock, generation works without `.env`: in `postinstall` before `pnpm env:init`, in CI and in Docker builds.

## pnpm workspaces and Angular

pnpm is the package manager. `pnpm-workspace.yaml` lists `apps/*` and `libs/*`, and dependencies between projects use `workspace:*`.

The TypeScript setup is integrated: `tsconfig.base.json` with `paths`, no TS project references. Angular does not support Nx's full "TS solution setup" (workspaces + project references), and the `@nx/angular` generators refuse to run with it (see angular/angular#37276).

### Where to declare dependencies

Single-version policy: all third-party packages (Angular, NestJS, Prisma, tooling) are declared only in the root `package.json`. Each package has one version, and `@angular/core` is not duplicated in isolated `node_modules`. Project `package.json` files contain only `name`, `private` and `workspace:*` links to other projects.

Nx generates `dist/<app>/package.json` for deployment itself: it finds external dependencies from imports in the code (including transitively through libraries) and takes versions from the root.

The exception is a package Nx cannot see in imports. Declare it in the `package.json` of the project that uses it, with the same version as in the root. Currently there is one: `@prisma/client` in `libs/database/package.json`. It is imported by the generated Prisma Client, and `src/generated` is git-ignored, so Nx does not analyze it. Without this entry `@prisma/client` would be missing from `dist/apps/backend/package.json`, and the backend would crash on startup in a Docker image. When upgrading Prisma, change the version in both places.
