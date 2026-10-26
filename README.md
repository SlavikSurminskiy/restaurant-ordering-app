# Restaurant Ordering

A real-time restaurant ordering prototype: an Nx monorepo with an Angular 22 frontend, a NestJS 11 backend and PostgreSQL via Prisma 7.

- **Menu setup** (admins): categories and dishes, prices, availability and open-price dishes; every change reaches open menus immediately.
- **Menu and cart:** a large virtualized menu, quantities, prices entered for open-price dishes, a fixed discount, and a checkout that never places an order twice and warns about menu changes first.
- **Orders:** a page where statuses update live; customers see their own orders, admins see all of them.

## Running the project

Requirements: Node.js 24+, pnpm 11, Docker (running).

```bash
pnpm install    # dependencies + Prisma Client
pnpm env:init   # .env from .env.example (keeps an existing .env)
pnpm start      # PostgreSQL → migrations → seed → backend + frontend
```

Open http://localhost:4200 (the API is on http://localhost:3000/api). Seeded users for local development:

| Email                  | Password      | Role     |
| ---------------------- | ------------- | -------- |
| `admin@example.com`    | `admin123`    | Admin    |
| `customer@example.com` | `customer123` | Customer |
| `alice@example.com`    | `alice123`    | Customer |

`pnpm test`, `pnpm lint` and `pnpm build` run for all projects. All commands, configuration and troubleshooting: [docs/development.md](docs/development.md).

## Key decisions and trade-offs

- **Shared contracts** (`libs/shared/api-types`) for both apps, so API changes fail at compile time.
- **Server-Sent Events** for one-way live updates, with a snapshot-plus-buffered-events protocol on every (re)connect.
- **Idempotent checkout:** an `Idempotency-Key` per attempt and a unique constraint on the server; the server rejects stale prices with `409 { conflicts }`, and the cart checks itself against the live menu before that.
- **Layered frontend:** data-access → domain → thin NgRx Signal Stores → pure components.

Details and the reasoning behind each: [docs/decisions.md](docs/decisions.md). Project layout and conventions: [docs/architecture.md](docs/architecture.md).

## Deliberate simplifications

No request-body validation on the backend, an in-memory event bus for one instance, stateless JWT without revocation or rate limiting, one global discount, a timer instead of a kitchen, no end-to-end tests. The full list: [docs/production-readiness.md](docs/production-readiness.md#deliberate-simplifications).

## Production readiness

Input validation and auth hardening, HTTPS with HTTP/2 behind a reverse proxy, a shared event bus (Redis or PostgreSQL `LISTEN/NOTIFY`) for several instances, resumable event streams, Docker images, monitoring and end-to-end tests. Details: [docs/production-readiness.md](docs/production-readiness.md#what-production-needs).
