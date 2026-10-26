# Key decisions and trade-offs

Conventions and project layout are in [architecture.md](architecture.md); this page explains why things are built the way they are.

## Stack and repository

- **Nx monorepo with shared contracts.** Angular and NestJS live in one repository with `libs/shared/api-types` (request, response and event types) and `libs/shared/utils` (`calculateTotals`, used by the cart and the server). A change to a contract breaks both sides at compile time instead of at runtime. Trade-off: Nx and an integrated TS setup add tooling to learn; module boundaries are enforced with tags so the frontend never imports Prisma models.
- **PostgreSQL via Prisma 7, money as integer cents.** No floating-point rounding in totals. Trade-off: every amount is converted to dollars only for display and in forms.
- **One command to start.** `pnpm start` starts PostgreSQL in Docker, applies migrations, seeds and starts both servers through Nx task dependencies. Trade-off: Docker is required even for frontend work.

## Real-time updates

- **Server-Sent Events, not WebSockets.** All live data flows one way, from server to client; writes are ordinary REST calls. SSE works over plain HTTP, reconnects by itself and passes the auth cookie. Trade-off: one long-lived connection per tab (see [production-readiness.md](production-readiness.md) for HTTP/2).
- **Snapshot plus events.** A client opens the stream, buffers events, loads the snapshot over HTTP and applies the buffer on top; it repeats this after every reconnect, and falls back to the snapshot alone if the stream does not open within 5 s. Events carry the full entity, so applying one never needs earlier state. Trade-off: events are not stored, so anything sent while a client is offline is recovered only through the next snapshot.
- **One shared stream, split in layers.** `SseDataAccessService` owns a single lazy `EventSource` with backoff; `LiveResourceFactoryService` implements the snapshot protocol once; the menu and orders domains pick their own events. Trade-off: more files between the socket and the screen, in exchange for one tested implementation of the protocol.
- **Order events only for their owner and admins.** The server reads the user from the cookie once per connection, so the client reconnects the stream after login and logout.

## Ordering

- **Idempotent checkout.** The client creates an `Idempotency-Key` per checkout attempt and reuses it on retry; the server has a unique `(userId, idempotencyKey)` constraint and returns the existing order when two requests race. A lost response can be retried safely, and a double click never creates two orders. Any change to the cart starts a new key.
- **The client sends the prices it showed.** The server compares them with the menu and answers `409 { conflicts }` (price changed, unavailable, removed) without creating anything. The cart also checks itself against the live menu and blocks checkout while it is out of date, so the 409 dialog is a last line of defence for changes that arrive during checkout.
- **Order lines copy the dish name and price.** Past orders stay correct when the menu changes or a dish is deleted.
- **Statuses move on a server timer.** NEW → PREPARING → READY → COMPLETED every `ORDER_STATUS_STEP_SECONDS`, based on `updatedAt`, so it survives restarts; admins can move an order on or cancel it.

## Frontend

- **Layers: data-access → domain → store → components.** HTTP lives in data-access, mapping and rules in domain services, state in NgRx Signal Stores. Stores are thin; logic sits in services next to them as pure state updaters, which are tested without a store.
- **Pure presentational components.** Cards and dialogs take inputs and emit outputs; pages handle the events. This also keeps per-dish UI state (chosen quantities) out of cards that the virtual list reuses.
- **Virtual scroll with fixed row height** for the large menu. Trade-off: every row has the same height, so long descriptions are cut to one line.
- **Cart in `localStorage`** (`withStorageSync`), so it survives reloads and a guest can sign in without losing it.
