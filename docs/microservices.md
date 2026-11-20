# Microservices

A plan, nothing is built yet. The goal is practice with a service split and with Kafka, not a need of the app: one NestJS backend is the right size for it. The split follows the **strangler fig** pattern: services are cut out of the monolith one at a time, and the app keeps working after every PR.

Two stages, in this order on purpose:

- **A. Split with synchronous HTTP.** The services exist and talk over HTTP; the problems of that (lost events, cascading failures, no fan-out to replicas) show up for real.
- **B. Kafka.** Events replace the HTTP calls exactly where stage A hurts; the order-status worker and several replicas become possible.

## Today

`apps/backend` modules: `auth`, `menu` (categories, dishes), `discount`, `orders` (conflicts, status, status timer), `events` (SSE and the in-memory `EventBus`), `health`. One Prisma schema in `libs/database`.

Links across future service boundaries:

| Link                      | Kind                                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| `Order.userId → User`     | foreign key, `Restrict`                                                     |
| `OrderItem.dishId → Dish` | foreign key, `SetNull`; name and price are already copied into the item     |
| order 409 check → dishes  | prices and availability read in the same transaction that creates the order |
| `EventBus.publish`        | called from `categories.service`, `dishes.service`, `orders.service`        |

## Stage A: target

```
browser ──► Traefik Ingress (routing by path)
              ├─ /              → frontend (nginx, static files only)
              ├─ /api/auth      → auth-service        ─┐
              ├─ /api/menu      → menu-service        ─┤ HTTP POST /internal/events
              ├─ /api/discount  → menu-service         │
              ├─ /api/orders    → orders-service ──────┤
              │                     └─ HTTP GET menu-service (prices, availability)
              └─ /api/events    → realtime-gateway  ◄──┘   (SSE to browsers)

One Postgres instance: schemas auth | menu | orders, one database user per service
```

| Service            | Takes from the monolith                                               | Data                                     |
| ------------------ | --------------------------------------------------------------------- | ---------------------------------------- |
| `auth-service`     | login, logout, me; issues the JWT cookie                              | schema `auth`: `users`                   |
| `menu-service`     | categories, dishes, discount; publishes `menu.*`                      | schema `menu`: `categories`, `dishes`    |
| `orders-service`   | orders, 409 conflicts, the status timer (until stage B)               | schema `orders`: `orders`, `order_items` |
| `realtime-gateway` | `GET /api/events` (SSE) with the "own orders / admin sees all" filter | none                                     |

Shared code in Nx:

- `libs/backend/auth`: JWT guards and decorators. Every service checks the JWT itself with the shared `JWT_SECRET`; only `auth-service` issues it.
- `libs/shared/api-types`: public contracts as now, plus contracts of the internal calls and events.
- One Prisma schema per service: `libs/<service>/database`, each with its own migrations and client.

### Data ownership

Each service owns its tables: only it reads and writes them, the others get the data through its API (stage A) or its events (stage B).

| Option                                 | Isolation                                      | On Always Free                                                 | Choice   |
| -------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- | -------- |
| One database, shared tables            | none; services integrate through tables        | free                                                           | no       |
| **One instance, a schema per service** | a service's DB user is granted only its schema | free: same pod and volume                                      | **yes**  |
| One instance, a `DATABASE` per service | stricter, no cross joins possible at all       | free, but moving data needs dump/restore                       | possible |
| A Postgres per service                 | independent versions, backups, failures        | not possible: each OCI volume is at least 50 GB, 50 GB is left | no       |

The shared instance is a conscious compromise: shared resources and one point of failure, not shared data.

### Decisions to make in stage A

1. **Foreign keys across services.** `Order.userId` and `OrderItem.dishId` become plain UUIDs; the code, not the database, keeps them valid. A deleted dish leaves a dangling `dishId` (today `SetNull`); clean it up by event in stage B or accept it.
2. **409 check without one transaction.** `orders-service` asks `menu-service` over HTTP, and a price can change between the check and the insert. Decide whether that window is acceptable (simplest: accept the client's prices if the menu confirmed them during the request).
3. **Synchronous `orders → menu` call.** Timeout, retries, and what happens when the menu is down (503 instead of an order): one service's failure becomes another's.
4. **Events over HTTP.** `menu-service` and `orders-service` `POST /internal/events` to the gateway: when the gateway is down, the event is lost; with two gateway replicas, only one gets it. Stage B fixes both.
5. **Routing.** `/api/*` moves from the frontend's nginx to path rules in the Traefik Ingress; locally `apps/frontend/proxy.conf.mjs` gets one target per path.
6. **Moving prod data.** Tables move into schemas with `ALTER TABLE ... SET SCHEMA`, plus one database user per service with grants on its schema only: hand-written SQL, so a separate migration and commit (see [architecture.md](architecture.md)).
7. **Local start.** Nx starts four backends on separate ports; the `serve` chain with `readyWhen: signal` grows accordingly.
8. **Deploy.** Four images instead of one: the `images.yml` matrix and the tag `sed` in its `deploy` job grow; a manifest per service; one migrate hook per database schema in Argo CD.

## Stage B: Kafka

- **Where Kafka runs.** Locally in Docker Compose (`apache/kafka`, KRaft) next to Postgres. In prod either **Strimzi** in OKE (one KRaft broker, about 1–1.5 GB of memory, and the last 50 GB of the Always Free block volume limit) or the **Aiven** free tier (5 topics × 2 partitions, 250 KiB/s, powers off when idle). The service code is the same; only `KAFKA_BROKERS` and TLS/SASL settings differ.
- **Transactional outbox.** A service writes the event into an `outbox` table in the same transaction as the data change; a relay moves it to Kafka. Without it, a crash between "commit" and "publish" loses or invents an event.
- **Gateway fan-out.** Each gateway replica reads every event, so each uses its own consumer group; then `orders-service` and the gateway can run several replicas ([deployment.md, step 8](deployment.md#8-several-backend-replicas)).
- **`kitchen-service`.** The order-status timer becomes a consumer of `order.created` that emits status changes; `orders-service` stays the only writer of `orders`. Topics keyed by `orderId` keep one order's events in order; consumers are idempotent; failures go to a dead-letter topic.
- **Menu projection (optional).** `orders-service` keeps its own copy of prices and availability from `menu.*` events and stops calling `menu-service` synchronously: eventual consistency instead of a runtime dependency.
- **Node client.** NestJS's Kafka transport uses `kafkajs`, which is barely maintained; `@confluentinc/kafka-javascript` has a compatible API but is native (librdkafka), which conflicts with the image's `--no-optional` install (see [CLAUDE.md](../CLAUDE.md)). Decide in the first stage B PR.

## PR order

Stage A:

1. **Seams inside the monolith.** Modules reach each other only through interfaces (`MenuClient`, `EventPublisher`), not through Prisma or `EventBus` directly; guards move to `libs/backend/auth`. No behaviour change.
2. **`auth-service`.** The simplest cut: the others only verify the JWT.
3. **`menu-service`** with discount; `orders` calls it over HTTP.
4. **`realtime-gateway`** fed by `POST /internal/events`.
5. **The rest of the monolith becomes `orders-service`.** Tables into schemas, database users, Traefik routes, CI matrix, Argo CD manifests.

Stage B:

6. Kafka locally and in prod; outbox in `menu-service` and `orders-service`.
7. Gateway reads Kafka instead of HTTP; two replicas of `orders-service`.
8. `kitchen-service` takes over the status timer.
9. Optional: menu projection in `orders-service`.

## Resources

Four or five Node services at 150–250 MB each fit on the two 6 GB nodes next to Postgres, Traefik, cert-manager and Argo CD. Kafka is the only large addition (stage B).
