# Simplifications and the way to production

## Deliberate simplifications

This is a prototype built to show the frontend architecture and real-time flow. These parts are kept simple on purpose:

| Area             | Simplification                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Input validation | The backend trusts request bodies. It checks only authentication, roles, UUID params, 404/409 and the dish price rules.                |
| Event bus        | In memory (RxJS `Subject`), one backend instance. Events are not stored.                                                               |
| Auth             | Stateless JWT in an httpOnly cookie: no token revocation, the role is trusted until the token expires, no rate limit on login.         |
| Discount         | One fixed discount for every order (`ORDER_DISCOUNT`), not chosen or entered by the user.                                              |
| Order statuses   | A timer stands in for the kitchen.                                                                                                     |
| Seed             | Demo users and orders; the demo orders are reset on every `pnpm start`.                                                                |
| Real-time        | One SSE stream for all events; no detection of a half-open connection beyond the browser's own reconnect and a 20 s heartbeat comment. |
| Tests            | Unit and component tests only; no end-to-end tests.                                                                                    |
| Performance      | No `@defer` and no Lighthouse budget yet; pages are lazy-loaded routes.                                                                |

## What production needs

### Security

- Validate every request body (for example `zod` or `class-validator`), and back the rules with CHECK constraints in the database.
- Rate-limit login (`@nestjs/throttler`), revoke tokens on logout (a denylist or short-lived access tokens with refresh), and check admin roles against the database.
- Serve over HTTPS and mark the auth cookie `Secure`; keep secrets in the platform's secret store.
- Fix the reported `pnpm audit` issues in transitive dependencies.

### Real-time at scale

- **HTTP/2 through a reverse proxy** (Caddy or nginx with TLS). Over HTTP/1.1 a browser keeps at most 6 connections per origin, and every SSE stream holds one; HTTP/2 multiplexes them over one connection. The proxy must not buffer `/api/events`.
- **A shared event bus** (Redis pub/sub or PostgreSQL `LISTEN/NOTIFY`) so several backend instances can publish to every client.
- **Resumable streams:** entity versions and `Last-Event-ID`, so a reconnecting client gets only what it missed instead of a full snapshot.
- Optionally one stream per resource with a server-sent snapshot followed by `{ upserted, removed }` batches, which moves the snapshot/buffer protocol from the client to the server (keeping an HTTP fallback when the stream is blocked).
- A client watchdog: send the heartbeat as a named event and reconnect when nothing arrives for ~50 s; ignore malformed events instead of stopping the stream.

### Operations

- Docker images for the backend and the static frontend, `prisma migrate deploy` as a release step, and no seed outside development.
- Health checks, structured logs, metrics and error tracking.
- End-to-end tests (Playwright) for the main flows: live menu changes, a double-clicked checkout, a 409 on a changed price, live order statuses.
- A performance budget: `@defer` for dialogs and below-the-fold content, and Lighthouse checks on the menu page in CI.
