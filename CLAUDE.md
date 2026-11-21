# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Restaurant ordering app: Nx 24 monorepo, Angular 22 frontend, NestJS 11 backend, PostgreSQL 18 via Prisma 7, pnpm 11. Human-facing docs: `README.md` (overview, how to run), `docs/development.md` (commands, config, troubleshooting), `docs/architecture.md` (conventions), `docs/decisions.md` (decisions and trade-offs), `docs/production-readiness.md` (simplifications, roadmap), `docs/deployment.md` (deployment plan: containers, Kubernetes, OpenTelemetry), `docs/microservices.md` (plan: service split, then Kafka). Keep them in sync with changes.

## Commands

```bash
pnpm install                 # postinstall also runs prisma generate
pnpm env:init                # create .env from .env.example (never overwrites)
pnpm start                   # docker Postgres → migrate deploy → seed → backend (3000) + auth-service (3001) + menu-service (3002) → frontend (4200)

pnpm build | pnpm test | pnpm lint      # run-many over all projects
pnpm format | pnpm format:check
pnpm nx <target> <project>              # projects: frontend, backend, auth-service, menu-service, backend-auth, database, shared-api-types, shared-utils

pnpm db:generate | db:migrate | db:deploy | db:reset | db:seed | db:studio
```

Single tests (verified syntax):

```bash
pnpm nx test frontend --include=apps/frontend/src/app/features/home/home.spec.ts   # Angular unit-test builder
pnpm nx test backend health.controller                                           # vitest file filter
pnpm nx test backend --testNamePattern="ping fails"                              # vitest test-name filter
```

Add `--skip-nx-cache` when you need a real re-run; Nx caches build/lint/test.

## Architecture

```
apps/frontend            Angular SPA; /api/auth → auth-service, /api/menu and /api/discount → menu-service, the rest of /api → backend (apps/frontend/proxy.conf.mjs; in deployments Traefik routes by path)
apps/backend             NestJS, global prefix /api; orders, SSE, the order-status timer
apps/auth-service        NestJS: login, logout, me; the only service that signs the JWT (stage A of docs/microservices.md)
apps/menu-service        NestJS: menu, categories, dishes, discount; sends menu.* events to the backend over HTTP
libs/backend/auth        @restaurant/backend-auth — JwtAuthModule, guards, decorators, cookie verification for every backend service
libs/shared/api-types    @restaurant/shared-api-types — API contracts used by both apps
libs/shared/utils        @restaurant/shared-utils — logic both apps share (e.g. `calculateTotals`)
libs/database            @restaurant/database — Prisma schema/migrations, seed (`src/seed`), PrismaService (backend services only)
```

- **Module boundaries** are enforced by `@nx/enforce-module-boundaries` (`eslint.config.mjs`) via tags: `scope:frontend` and `scope:backend` may only import their own scope plus `scope:shared`. Every new project needs a `scope:*` tag. Prisma models must never leak into `shared-api-types`; the frontend depends only on API contracts.
- **Startup chain**: `frontend:serve` depends on `backend:serve`, `auth-service:serve` and `menu-service:serve`, each of which depends on its own build (→ `^prisma-generate`) and `database:prisma-seed` (→ `prisma-migrate-deploy` → `postgres-up`, i.e. `docker compose up -d --wait`). All `database:prisma-*` targets that need a DB depend on `postgres-up`; the seed is idempotent, so it runs on every start. All servers report readiness to Nx through `NX_READY_SIGNAL_SOCKET` in their `main.ts` (`readyWhen: signal`), and only then the frontend dev server starts.
- **Backend wiring**: `ConfigModule` is global and reads `.env` if present; `DatabaseModule` is `@Global()` and exports `PrismaService` (extends `PrismaClient` with the `PrismaPg` driver adapter). `GET /api/health` returns `HealthResponse` from shared-api-types. `EventsModule` is `@Global()` and exports `EventBus` (in-memory RxJS); `GET /api/events` streams `ServerEvent` (shared-api-types) over SSE with a comment heartbeat — see `docs/architecture.md`. Service-to-service routes (`INTERNAL_*_PATH` in shared-api-types: `POST /internal/events` on the backend, `POST /internal/order-pricing` on menu-service) are excluded from the `/api` prefix, so no proxy routes them from outside; their URLs come from `EVENTS_URL` and `MENU_SERVICE_URL`.
- **Frontend conventions**: standalone components, zoneless, signals; feature pages live in `src/app/features/<name>/` and are lazy-loaded from `app.routes.ts`. Material theme is defined in `src/styles.scss` with `mat.theme`. Tests use `@testing-library/angular` plus `HttpTestingController`.
- **Generators**: `nx.json` sets defaults (scss, OnPush, vitest). Prefer `pnpm nx g ...` and `@nx/workspace:move` for renames; after a move, fix relative paths in the project's `vitest.config.mts` and `workspace:*` deps in apps' `package.json`, which the generator does not update.

## Non-obvious constraints

- **TS setup is integrated** (`tsconfig.base.json` `paths`, no project references). Angular does not support Nx's TS solution setup; don't add a root `tsconfig.json` with `references`, or the Angular generators stop working. Exception: the frontend's own aliases (`@restaurant/frontend/{core,data-access,domain}/*`, `@restaurant/frontend/ui`, each pointing to an `index.ts`) live in `apps/frontend/tsconfig.json`, which repeats `@restaurant/shared-api-types` because `paths` replaces the base ones. In `tsconfig.base.json` they would break `@nx/enforce-module-boundaries` (a project may not import itself through an alias). Use them instead of `../` imports into `core/` and `shared/`; inside one aliased folder imports stay relative.
- **Dependencies**: single-version policy. Third-party packages go only into the root `package.json`; project `package.json` files hold only `workspace:*` links. Exceptions, declared with the same version as root because Nx cannot see them in imports and would otherwise drop them from `dist/apps/backend/package.json`: `@prisma/client` in `libs/database/package.json` (only the git-ignored generated client imports it) and `tslib` in `apps/backend/package.json` (`importHelpers` emits `require("tslib")` in compiled code).
- **Deploy output**: `<app>:prepare-deploy` for `backend`, `auth-service` and `menu-service` (build → strip `workspace:*` deps with `tools/scripts/strip-workspace-deps.mjs` → `pnpm install --lockfile-only`) makes `dist/apps/<app>` installable outside the monorepo; the image installs it with `--prod --frozen-lockfile --no-optional`, which drops the optional peers `prisma`/`typescript` that pnpm links to `@prisma/client` (and every other optional dependency — revisit if a native-binary package is added). Don't bring back Nx's `prune`/`prune-lockfile`/`copy-workspace-modules`: they assume the TS solution setup and drop all third-party deps here (see `docs/architecture.md`).
- **Env loading**: Nx loads the root `.env` into every task. Prisma 7 does not read `.env` itself, so run the Prisma CLI only via `pnpm db:*` / `nx run database:*`, never `prisma ...` directly. `prisma-generate` sets a mock `DATABASE_URL` in `libs/database/project.json` so generation works without `.env` (postinstall, CI).
- **`BACKEND_PORT`, not `PORT`**: Nx passes `.env` to all tasks and the Angular dev server would also pick up `PORT`.
- **Prisma client** is generated to `libs/database/src/generated` (git-ignored, excluded from lint/prettier). `moduleFormat = "cjs"` in `schema.prisma` is required: the backend is bundled as CommonJS by webpack, and `esm` breaks the build.
- **Migrations**: never edit a Prisma-generated `migration.sql`. Schema change → `pnpm db:migrate --name <x>` → commit. CHECK constraints and other SQL Prisma can't model go into a separate `--create-only` migration and a separate commit (see `docs/architecture.md`). `prisma migrate reset` refuses to run under Claude Code without explicit user consent.
- **New env variables** must also be added to `.env.example`; `.env` and `.env.*` are git-ignored.
- `backend:serve` opens the Node inspector on 9229, `auth-service:serve` on 9230, `menu-service:serve` on 9231. Leftover dev servers can hold ports 3000–3002/4200/9229–9231 after a run.
