# Deployment plan

Step 1 (container images) is done; the later steps are still a plan. The goal is a free public deployment that doubles as Kubernetes practice, with OpenTelemetry added later. Free-tier terms change often; check them before choosing.

## Constraints from the current code

| Constraint                                                                                               | Consequence                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/events` is a long-lived SSE stream                                                             | No platforms with short request timeouts or buffering rewrites (Vercel/Netlify rewrites). Every proxy on the path must not buffer `/api/events`.   |
| `EventBus` is in memory, and order statuses advance on an in-process timer                               | Exactly **one** backend replica until the bus is shared (see [step 7](#7-several-backend-replicas)). Scale-to-zero platforms also pause the timer. |
| The frontend calls `/api` on its own origin (`proxy.conf.mjs` in development)                            | Serve frontend and API from one origin: nginx in front of the backend, so no CORS and the `lax` auth cookie keeps working.                         |
| The auth cookie is `Secure` only when `NODE_ENV=production`                                              | Deployed environments set `NODE_ENV=production` and serve over HTTPS.                                                                              |
| `prisma migrate deploy` and the seed need the Prisma CLI, `prisma.config.ts` and the migrations          | The runtime image (`dist/apps/backend`) does not have them; migrations run from a separate image as a release step.                                |
| The seed creates demo users with known passwords, including an admin, and resets demo orders on each run | A public deployment must not run the development seed as is (see [open questions](#open-questions)).                                               |

## Platform options

| Option                                   | Fits                                        | Limits                                                                                     |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Render or Koyeb (Docker) + Neon Postgres | Quickest public link                        | Free services sleep after inactivity: cold starts, dropped SSE, paused order-status timer. |
| Google Cloud Run + Neon                  | Containers with SSE (timeouts up to 60 min) | Billing account required; `max-instances=1` because of the in-memory bus.                  |
| **Oracle Cloud Always Free + k3s**       | Real Kubernetes, always on                  | ARM (arm64) VMs only for the large shape; regional capacity and sign-up can be unreliable. |
| Local k3d / kind                         | Learning and rehearsing manifests           | Not public.                                                                                |

**Chosen path:** containers → local k3d → Oracle Always Free with k3s → OpenTelemetry, with Postgres inside the cluster. The main goal is hands-on practice, so managed databases (Neon, Supabase) and Google Cloud are not used.

## Steps

### 1. Container images

- `apps/backend/Dockerfile`, multi-stage: `pnpm install --frozen-lockfile` → `nx run backend:prepare-deploy` → runtime stage on `node:24-slim` with `main.js`, `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` from `dist/apps/backend` and `pnpm install --prod --frozen-lockfile`, a non-root user, `NODE_ENV=production`. See [architecture.md](architecture.md#deploy-output).
- `apps/frontend/Dockerfile`: `nx build frontend` → `nginx` serving the static files with an SPA fallback to `index.html`, and proxying `/api` to the backend service. For `/api/events`: `proxy_buffering off`, `proxy_read_timeout` above the 20 s heartbeat, HTTP/1.1 to the upstream.
- `libs/database/Dockerfile`: a migrate image with only the Prisma CLI (root `package.json` version), `libs/database/prisma` and `prisma.config.ts`; its command is `prisma migrate deploy`.
- `.dockerignore`: `node_modules`, `dist`, `.nx`, `.env*`, `libs/database/src/generated`.
- Check: `docker-compose.prod.yml` runs Postgres → migrate → backend → frontend locally on http://localhost:8080 ([how](development.md#production-like-stack)).

### 2. Kubernetes manifests, run locally on k3d

Layout: `deploy/k8s/base` plus overlays `local` and `oracle` (Kustomize; Helm only if templating grows).

| Resource                          | Purpose                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Namespace`                       | `restaurant`                                                                                                                          |
| `Deployment` + `Service` backend  | `replicas: 1`, `strategy: Recreate` (no two instances during a rollout), probes on `/api/health`, resource requests/limits            |
| `Deployment` + `Service` frontend | nginx; may have several replicas                                                                                                      |
| `Job` migrate                     | `prisma migrate deploy` before the backend rollout (or an `initContainer` on the backend)                                             |
| Postgres                          | **CloudNativePG** operator `Cluster` with one instance and a PVC (practice with an operator, backups later); or a plain `StatefulSet` |
| `Secret`                          | `DATABASE_URL`, `JWT_SECRET`; never committed (see step 4)                                                                            |
| `ConfigMap`                       | `BACKEND_PORT`, `ORDER_DISCOUNT`, `ORDER_STATUS_STEP_SECONDS`, `JWT_TTL`, `NODE_ENV`                                                  |
| `Ingress`                         | Traefik (built into k3s/k3d) → frontend service; no buffering for `/api/events`                                                       |

Check: `k3d cluster create`, import or pull the images, `kubectl apply -k deploy/k8s/overlays/local`; log in, open the menu in two tabs, change a dish and see it update live; delete the backend pod and see the stream reconnect.

### 3. CI: images to a registry

- A GitHub Actions workflow on `main` (after the existing `CI` checks) builds the three images with `docker buildx` for `linux/amd64` and `linux/arm64` (Oracle A1 is ARM) and pushes them to GHCR, tagged with the commit SHA.
- Manifests reference images by SHA tag, never `latest`.

### 4. Oracle Always Free with k3s

- One Ampere A1 VM (for example 2–4 OCPU, 12–24 GB), Ubuntu; open ports 80/443 in the security list and the host firewall; SSH only by key.
- Install k3s (Traefik and local-path storage included); kubeconfig on the local machine through an SSH tunnel or a restricted API port.
- Domain (a free subdomain such as DuckDNS, or an own domain), **cert-manager** with Let's Encrypt for HTTPS.
- Secrets: **Sealed Secrets** or **SOPS** so that encrypted secrets can live in the repository; a strong `JWT_SECRET`.
- Backups: CloudNativePG backups to Object Storage (Oracle gives free S3-compatible storage), or a `CronJob` with `pg_dump`.
- Check: the step 2 scenario over HTTPS; the auth cookie is `Secure`.

### 5. GitOps (optional)

**Argo CD** in the cluster watches `deploy/k8s/overlays/oracle`; CI updates the image tag in the overlay (a commit or Argo CD Image Updater). Deploys become a merge, and rollback is a revert.

### 6. OpenTelemetry

- Backend: `@opentelemetry/sdk-node` with auto-instrumentations for HTTP, Express, NestJS and `pg`, plus `@prisma/instrumentation`; service name and version as resource attributes; logs correlated with trace IDs.
- **Bundling:** the backend is bundled by webpack, and auto-instrumentation patches modules through `require` hooks, which do not see bundled code. Either keep the instrumented packages external in the webpack config or start the SDK with `node --require` before the bundle; verify that spans actually appear.
- SSE: do not keep one span open for the whole stream; trace the connect and the events.
- Frontend (later): `@opentelemetry/sdk-trace-web` with fetch instrumentation and `traceparent` propagation to `/api`.
- Export over OTLP to an **OpenTelemetry Collector** in the cluster, then to **Grafana Cloud** (free tier) or a self-hosted `grafana/otel-lgtm` (fits in the Oracle VM's memory).
- New env variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`) go into `.env.example`; the SDK is off when no endpoint is set.

### 7. Several backend replicas

Replace the in-memory `EventBus` with PostgreSQL `LISTEN/NOTIFY` (no new infrastructure) or Redis pub/sub, and move the order-status timer to a single worker or a database-driven job. Then: `replicas: 2+`, `RollingUpdate`, a `PodDisruptionBudget`, an HPA. See [production-readiness.md](production-readiness.md#real-time-at-scale).

## Open questions

- **Demo data in public:** a production seed with the menu and one admin whose password comes from a secret, or demo users with read-only behaviour, or no public admin at all.
- **Domain:** a free subdomain or an own domain.
- **Telemetry backend:** Grafana Cloud (nothing to run) or self-hosted LGTM (more practice, more memory).
- **Postgres in the cluster:** the CloudNativePG operator or a plain `StatefulSet` first (to see what the operator automates).
