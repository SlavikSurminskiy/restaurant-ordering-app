# Microservices

A plan in progress: stage A has split the monolith into `auth-service`, `menu-service`, `realtime-gateway` and `orders-service`, each owning a Postgres schema; database users per service and stage B are not built yet. The goal is practice with a service split and with Kafka, not a need of the app: one NestJS backend is the right size for it. The split follows the **strangler fig** pattern: services are cut out of the monolith one at a time, and the app keeps working after every PR.

Two stages, in this order on purpose:

- **A. Split with synchronous HTTP.** The services exist and talk over HTTP; the problems of that (lost events, cascading failures, no fan-out to replicas) show up for real.
- **B. Kafka.** Events replace the HTTP calls exactly where stage A hurts; the order-status worker and several replicas become possible.

## Today

Before the split, `apps/backend` modules: `auth`, `menu` (categories, dishes), `discount`, `orders` (conflicts, status, status timer), `events` (SSE and the in-memory `EventBus`), `health`. One Prisma schema in `libs/database`.

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
- **Chosen:** one `schema.prisma` in `libs/database` with `@@schema` per model and one migration history; the services share the generated client, and the boundary is kept by the code and, later, by database users. The alternative, a Prisma schema per service (`libs/<service>/database`, own migrations and client), separates them fully but needs one migrate job per service; revisit if a service moves to its own database.

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

1. **Foreign keys across services.** **Done:** `Order.userId` and `OrderItem.dishId` are plain UUIDs; the code, not the database, keeps them valid (`userId` comes from the JWT, `dishId` is checked by `order-pricing`). A deleted dish leaves a dangling `dishId` (before: `SetNull`); clean it up by event in stage B or accept it. The buyer's name is a snapshot: auth-service puts a `name` claim into the JWT, orders-service copies it into `orders.userName` like the item names, so listing orders reads no other schema. Tokens issued before the claim are rejected (401), and the user logs in again.
2. **409 check without one transaction.** `orders-service` asks `menu-service` over HTTP, and a price can change between the check and the insert. **Chosen:** the window is accepted; the price the menu confirmed during the request is what the order keeps.
3. **Synchronous `orders → menu` call.** **Chosen:** `MenuClient` calls `POST /internal/order-pricing` with a 3 s timeout and no retries; any failure is `503`, and the checkout retries with the same `Idempotency-Key`. One service's failure becomes another's.
4. **Events over HTTP.** `menu-service` and `orders-service` `POST /internal/events` to the gateway: when the gateway is down, the event is lost; with two gateway replicas, only one gets it. Stage B fixes both. **Chosen for stage A:** `EventPublisher` (`libs/backend/events`) awaits the POST, logs a failure and does not throw. A lost event costs nothing while the gateway is down, because its SSE clients reconnect and reload the snapshot; the gateway runs one replica with `strategy: Recreate`, so all clients reconnect together.
5. **Routing.** `/api/*` moves from the frontend's nginx to path rules in the Traefik Ingress; locally `apps/frontend/proxy.conf.mjs` gets one target per path.
6. **Moving prod data.** **Done:** tables and enums move into schemas `auth`, `menu`, `orders` with `ALTER TABLE/TYPE ... SET SCHEMA` (hand-written migration). Next: one database user per service with grants on its schema only. During the rollout the migrate job moves the tables before the new pods start: the old pods query `public.*` and fail for about a minute, and old orders-service pods can't create orders once `userName` is `NOT NULL`.
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

## Later: build and deploy only what changed

Postponed until every service in this plan is cut out; then the set of images is stable.

**Today** every merge to `main` that touches code builds all images (a static matrix in `images.yml`; the layer cache makes unchanged ones fast, but they are still built and pushed), and the `deploy` job writes the new commit tag into every `image:` line. Argo CD compares only manifest text, not image contents, so it sees every Deployment changed and restarts all pods. Consequences:

- A change in one service restarts the others. orders-service and the gateway run with `strategy: Recreate`, so each merge gives them a few seconds without a pod: SSE clients reconnect, and service-to-service calls to them fail meanwhile (seen after #27: menu-service got a connect timeout to `backend:3000` during that window).
- The tag says which commit built the image, not when the service last changed.

**Plan:**

- A first job lists the affected projects with `nx show projects --affected`, with the base from `nrwl/nx-set-shas`: the last **successful** run on `main`, so a failed build is retried by the next merge. The build matrix is made from that list; the `migrate` image follows `libs/database`.
- The `deploy` job rewrites only the tags of the images it built; Argo CD then restarts only those Deployments.
- Nx's project graph decides what is affected: a change in `libs/shared/api-types` rebuilds the backend services and the frontend, one in `libs/backend/auth` only the backend services.
- Alternative: tag images by content (the Nx task hash or the image digest) instead of the commit, so a rebuilt but unchanged image keeps its tag. More robust, but the tag no longer points to a commit.

## Resources

The scheduler places pods by their **requests**, not by real use. Each node (1 OCPU, 6 GB) offers 840m CPU and about 4.3 GiB to pods; on 2026-11-21 the pods requested 740m + 580m CPU and 1.4 + 1.0 GiB memory. **CPU requests are the limit, not memory**: OKE's own pods (flannel, CoreDNS, CSI, agents) take about 300m per node.

- **Stage A fits.** `auth-service`, `menu-service` and `realtime-gateway` at about 50m CPU and 192 MiB each, one replica each; the old backend's 250m stays with `orders-service`. The real use of the backend is about 180 MiB and almost no CPU, so its request can go down too.
- **Stage B does not fit as is.** Strimzi with one KRaft broker needs about 1–1.5 GB and a few hundred millicores. Options: lower the requests to real use, or grow the node pool to 2 OCPU and 12 GB per node in `deploy/terraform/oke.tf` (still within Always Free: 4 OCPU and 24 GB in total; new shapes apply to new nodes, so the nodes are replaced), or Aiven instead of an in-cluster broker.
- Several replicas of a stateless service (for a node failure) cost one more request each; add them after the node pool grows.
