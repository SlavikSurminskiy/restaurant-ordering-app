# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Restaurant ordering app: Nx 24 monorepo, Angular 22 frontend, NestJS 11 backend, PostgreSQL 18 via Prisma 7, pnpm 11. Human-facing docs: `README.md` (setup, commands) and `docs/architecture.md` (conventions). Keep both in sync with changes.

## Commands

```bash
pnpm install                 # postinstall also runs prisma generate
pnpm env:init                # create .env from .env.example (never overwrites)
pnpm start                   # docker Postgres → migrate deploy → seed → backend (3000) → frontend (4200)

pnpm build | pnpm test | pnpm lint      # run-many over all projects
pnpm format | pnpm format:check
pnpm nx <target> <project>              # projects: frontend, backend, database, shared-api-types

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
apps/frontend            Angular SPA; /api is proxied to the backend (apps/frontend/proxy.conf.mjs)
apps/backend             NestJS, global prefix /api
libs/shared/api-types    @restaurant/shared-api-types — API contracts used by both apps
libs/database            @restaurant/database — Prisma schema/migrations, seed (`src/seed`), PrismaService (backend only)
```

- **Module boundaries** are enforced by `@nx/enforce-module-boundaries` (`eslint.config.mjs`) via tags: `scope:frontend` and `scope:backend` may only import their own scope plus `scope:shared`. Every new project needs a `scope:*` tag. Prisma models must never leak into `shared-api-types`; the frontend depends only on API contracts.
- **Startup chain**: `frontend:serve` depends on `backend:serve`, which depends on `backend:build` (→ `^prisma-generate`) and `database:prisma-seed` (→ `prisma-migrate-deploy` → `postgres-up`, i.e. `docker compose up -d --wait`). All `database:prisma-*` targets that need a DB depend on `postgres-up`; the seed is idempotent, so it runs on every start. The backend reports readiness to Nx through `NX_READY_SIGNAL_SOCKET` in `apps/backend/src/main.ts` (`readyWhen: signal`), and only then the frontend dev server starts.
- **Backend wiring**: `ConfigModule` is global and reads `.env` if present; `DatabaseModule` is `@Global()` and exports `PrismaService` (extends `PrismaClient` with the `PrismaPg` driver adapter). `GET /api/health` returns `HealthResponse` from shared-api-types.
- **Frontend conventions**: standalone components, zoneless, explicit `ChangeDetectionStrategy.OnPush`, signals; feature pages live in `src/app/features/<name>/` and are lazy-loaded from `app.routes.ts`. Material theme is defined in `src/styles.scss` with `mat.theme`. Tests use `@testing-library/angular` plus `HttpTestingController`.
- **Generators**: `nx.json` sets defaults (scss, OnPush, vitest). Prefer `pnpm nx g ...` and `@nx/workspace:move` for renames; after a move, fix relative paths in the project's `vitest.config.mts` and `workspace:*` deps in apps' `package.json`, which the generator does not update.
- **Planned, not implemented yet**: SSE endpoint (`/api/events`) with an in-memory RxJS EventBus, JWT in httpOnly cookie with Guards/`@Roles()`, NgRx SignalStore stores (`@ngrx/signals`, `@angular-architects/ngrx-toolkit` are installed but unused).

## Non-obvious constraints

- **TS setup is integrated** (`tsconfig.base.json` `paths`, no project references). Angular does not support Nx's TS solution setup; don't add a root `tsconfig.json` with `references`, or the Angular generators stop working.
- **Dependencies**: single-version policy. Third-party packages go only into the root `package.json`; project `package.json` files hold only `workspace:*` links. Exception: `@prisma/client` is also declared in `libs/database/package.json` (same version as root), because only the git-ignored generated client imports it and Nx would otherwise drop it from `dist/apps/backend/package.json`.
- **Env loading**: Nx loads the root `.env` into every task. Prisma 7 does not read `.env` itself, so run the Prisma CLI only via `pnpm db:*` / `nx run database:*`, never `prisma ...` directly. `prisma-generate` sets a mock `DATABASE_URL` in `libs/database/project.json` so generation works without `.env` (postinstall, CI).
- **`BACKEND_PORT`, not `PORT`**: Nx passes `.env` to all tasks and the Angular dev server would also pick up `PORT`.
- **Prisma client** is generated to `libs/database/src/generated` (git-ignored, excluded from lint/prettier). `moduleFormat = "cjs"` in `schema.prisma` is required: the backend is bundled as CommonJS by webpack, and `esm` breaks the build.
- **Migrations**: never edit a Prisma-generated `migration.sql`. Schema change → `pnpm db:migrate --name <x>` → commit. CHECK constraints and other SQL Prisma can't model go into a separate `--create-only` migration and a separate commit (see `docs/architecture.md`). `prisma migrate reset` refuses to run under Claude Code without explicit user consent.
- **New env variables** must also be added to `.env.example`; `.env` and `.env.*` are git-ignored.
- `backend:serve` opens the Node inspector on 9229. Leftover dev servers can hold ports 3000/4200/9229 after a run.
