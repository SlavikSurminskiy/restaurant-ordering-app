# Deployment

Steps 1–6 are in place: the app is deployed to OKE (Oracle Kubernetes Engine) in Oracle Cloud Always Free, created with Terraform, at https://92-5-5-205.sslip.io, and Argo CD rolls out every merge to `main`. Steps 7–8 are still a plan. The goal is a free public deployment that doubles as Kubernetes practice. Free-tier terms change often; check them before changing sizes or shapes.

## Constraints from the current code

| Constraint                                                                                               | Consequence                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/events` is a long-lived SSE stream                                                             | No platforms with short request timeouts or buffering rewrites (Vercel/Netlify rewrites). Every proxy on the path must not buffer `/api/events`.   |
| `EventBus` is in memory (realtime-gateway), and order statuses advance on an in-process timer (backend)  | Exactly **one** replica of each until the bus is shared (see [step 8](#8-several-backend-replicas)). Scale-to-zero platforms also pause the timer. |
| The frontend calls `/api` on its own origin (`proxy.conf.mjs` in development)                            | Serve frontend and API from one origin: Traefik routes `/` and `/api/*` by path, so no CORS and the `lax` auth cookie keeps working.               |
| The auth cookie is `Secure` only when `NODE_ENV=production`                                              | Deployed environments set `NODE_ENV=production` and serve over HTTPS.                                                                              |
| `prisma migrate deploy` and the seed need the Prisma CLI, `prisma.config.ts` and the migrations          | The runtime images (`dist/apps/backend/<service>`) do not have them; migrations run from a separate image as a release step.                       |
| The seed creates demo users with known passwords, including an admin, and resets demo orders on each run | A public deployment must not run the development seed as is (see [open questions](#open-questions)).                                               |

## Platform options

| Option                                   | Fits                                        | Limits                                                                                     |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Render or Koyeb (Docker) + Neon Postgres | Quickest public link                        | Free services sleep after inactivity: cold starts, dropped SSE, paused order-status timer. |
| Google Cloud Run + Neon                  | Containers with SSE (timeouts up to 60 min) | Billing account required; `max-instances=1` because of the in-memory bus.                  |
| **Oracle Cloud Always Free + OKE**       | Real managed Kubernetes, always on          | ARM (arm64) nodes only; A1 capacity per region can run out.                                |

**Chosen path:** container images → CI to GHCR → OKE created with Terraform → plain manifests applied one by one → HTTPS with Traefik and cert-manager → deploys by Argo CD from git → OpenTelemetry, with Postgres inside the cluster. The main goal is hands-on practice, so there is no managed database and no Kustomize or Helm chart of our own: each file is applied and checked before the next.

## Steps

### 1. Container images

- `apps/backend/orders-service/Dockerfile`, multi-stage: `pnpm install --frozen-lockfile` → `nx run orders-service:prepare-deploy` → runtime stage on `node:24-slim` with `main.js`, `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` from `dist/apps/backend/orders-service` and `pnpm install --prod --frozen-lockfile`, a non-root user, `NODE_ENV=production`. See [architecture.md](architecture.md#deploy-output).
- `apps/backend/auth-service/Dockerfile`, `apps/backend/menu-service/Dockerfile` and `apps/backend/realtime-gateway/Dockerfile`: the same with their own `prepare-deploy` and ports 3001, 3002 and 3003.
- `apps/frontend/Dockerfile`: `nx build frontend` → `nginx` serving the static files with an SPA fallback to `index.html`, and `404` for any `/api` path: Traefik routes every service path before nginx.
- `libs/database/Dockerfile`: a migrate image with only the Prisma CLI (root `package.json` version), `libs/database/prisma` and `prisma.config.ts`; its command is `prisma migrate deploy`.
- `.dockerignore`: `node_modules`, `dist`, `.nx`, `.env*`, `libs/database/src/generated`.
- Check: `docker-compose.prod.yml` runs Postgres → migrate → the services → frontend locally behind Traefik on http://localhost:8080 ([how](development.md#production-like-stack)).

### 2. CI: images to a registry

`.github/workflows/images.yml`:

- Runs on pull requests, on pushes to `main` and manually (`workflow_dispatch`); changes only to docs, Markdown or `deploy/` don't trigger it.
- Builds the six images for `linux/arm64` only (Oracle A1 is ARM) on an ARM runner (`ubuntu-24.04-arm`, free for public repositories), so nothing runs under QEMU. They don't run on amd64 nodes; adding `linux/amd64` later means QEMU with `FROM --platform=$BUILDPLATFORM` for the build stages, or a build per platform joined into one multi-arch tag.
- Pushes to `ghcr.io/slaviksurminskiy/restaurant-{orders-service,auth-service,menu-service,realtime-gateway,frontend,migrate}` with the built-in `GITHUB_TOKEN`, tagged with the short SHA of the commit (for a PR, its last commit, not GitHub's merge commit), plus `main` on the main branch. The packages are public, so the cluster pulls them without credentials. GHCR creates a new package as private on its first push: make it public in the package settings before a manifest uses it, or the pods get `ImagePullBackOff`.
- A smoke test runs the migrate image against an empty Postgres.
- Manifests reference images by SHA tag, never `latest`. Every environment deploys the same image; environments differ only in configuration and secrets.

### 3. OKE cluster with Terraform

`deploy/terraform/`, run from that folder with the OCI CLI configured (profile `DEFAULT` in `~/.oci/config`):

| File         | Creates                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `network.tf` | VCN `10.0.0.0/16`, subnet for the API endpoint and nodes, subnet for load balancers, internet gateway, route table, one security list (80/443 public) |
| `oke.tf`     | `BASIC_CLUSTER` (the enhanced type is paid) with a public API endpoint, Flannel overlay; node pool of two `VM.Standard.A1.Flex` nodes, 1 OCPU / 6 GB  |
| `outputs.tf` | availability domains and `kubeconfig_command`, which writes the cluster into `~/.kube/config`                                                         |

- Always Free limits that the values are sized to: 4 OCPU / 24 GB of A1 in total (two nodes use 2 / 12), 200 GB of block volumes (two 50 GB boot volumes + the 50 GB Postgres volume), one 10 Mbps flexible load balancer.
- `terraform.tfvars` (from `terraform.tfvars.example`), `*.tfstate` and `.terraform/` are git-ignored; the state is local, so it lives only on the machine that ran `terraform apply`. `.terraform.lock.hcl` is committed and pins the provider.
- The node image OCID in `oke.tf` is per region and per Kubernetes version, and Oracle removes old images after a few months; the comment there shows how to find a newer one.

```bash
terraform init
terraform plan
terraform apply
# then run the printed kubeconfig_command; check with: kubectl get nodes
```

### 4. Kubernetes manifests

`deploy/k8s/`, plain YAML applied in file order with `kubectl apply -f <file>`. Each file starts with a comment that lists its names and how they link to the other files.

| File                       | Resources                                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-namespace.yaml`        | `Namespace` `restaurant`                                                                                                                                                         |
| `02-postgres.yaml`         | headless `Service` `db` + `StatefulSet` `pg-server` (Postgres 18) with a 50 GB PVC on the default `oci-bv` storage class                                                         |
| `03-migrate-job.yaml`      | `Job` with the migrate image (`prisma migrate deploy`); no seed                                                                                                                  |
| `04-orders-service.yaml`   | `ConfigMap` `orders-service-config`, `Deployment` `orders-service` (`replicas: 1`, `strategy: Recreate`: the status timer), `Service`                                            |
| `05-frontend.yaml`         | `Deployment` + `Service` `frontend` (nginx; static files only)                                                                                                                   |
| `08-auth-service.yaml`     | `ConfigMap` `auth-service-config`, `Deployment` `auth-service` (`replicas: 1`, `RollingUpdate`, probes on `/api/health`), `Service`; `JWT_SECRET` from the Secret `backend`      |
| `09-menu-service.yaml`     | `ConfigMap` `menu-service-config` (`ORDER_DISCOUNT`, `EVENTS_URL`), `Deployment` `menu-service` (`replicas: 1`), `Service`; orders-service reaches it through `MENU_SERVICE_URL` |
| `10-realtime-gateway.yaml` | `Deployment` `realtime-gateway` (`replicas: 1`, `strategy: Recreate`: the bus is in memory), `Service`; orders-service and menu-service reach it through `EVENTS_URL`            |

Secrets are not in the repository. Create them after the namespace and before `02-postgres.yaml`:

```bash
kubectl apply -f deploy/k8s/01-namespace.yaml
kubectl -n restaurant create secret generic postgres \
  --from-literal=POSTGRES_USER=restaurant --from-literal=POSTGRES_DB=restaurant \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 24)"
kubectl -n restaurant create secret generic backend --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
```

A new release by hand: change the image tags in `03`–`05` and `08`–`10`, delete the finished `Job` (its template can't be changed) and apply `03`, then `05`, `08`, `09`, `10`, `07` and `04`. With Argo CD ([step 6](#6-gitops-argo-cd)) this happens on its own after every merge to `main`.

Check: `kubectl -n restaurant get pods` shows `pg-server-0`, `orders-service-…`, `frontend-…`, `auth-service-…`, `menu-service-…` and `realtime-gateway-…` as `Running` and the migrate pod as `Completed`; `kubectl -n restaurant port-forward svc/frontend 8080:80` opens the app on http://localhost:8080.

### 5. HTTPS: Traefik and cert-manager

Both are installed with Helm from their OCI registries (no `helm repo add`); the exact commands are at the top of each values file in `deploy/helm/`.

- **Traefik** (`traefik-values.yaml`) is the ingress controller. Its `LoadBalancer` Service becomes an OCI load balancer in the `restaurant-lb` subnet; annotations keep it in Always Free (flexible, 10 Mbps) and stop OKE from editing the security list that Terraform owns. TLS ends in Traefik, and port 80 redirects to HTTPS with the lowest router priority, so the ACME challenge route still wins there.
- **cert-manager** (`cert-manager-values.yaml`, CRDs installed with the chart) gets certificates from Let's Encrypt with the HTTP-01 challenge and renews them.
- `06-cluster-issuer.yaml`: `ClusterIssuer`s `letsencrypt-staging` (for debugging, high rate limits) and `letsencrypt-prod`.
- `07-ingress.yaml`: host `92-5-5-205.sslip.io` (sslip.io resolves it to the load balancer's IP, so no domain is needed) → `/api/auth` to `auth-service`, `/api/menu` and `/api/discount` to `menu-service`, `/api/events` to `realtime-gateway`, everything else to `frontend`, only on the HTTPS entrypoint; cert-manager puts the certificate into the `restaurant-tls` Secret. A new load balancer gets a new IP, and then the host must change.

Order: Traefik → read the IP with `kubectl -n traefik get svc traefik` → cert-manager → `06` → `07`.

Check: `kubectl -n restaurant get certificate` shows `READY True`; `curl -I http://92-5-5-205.sslip.io/` answers `301` to HTTPS; log in, open the menu in two tabs, change a dish and see it update live; the auth cookie is `Secure`.

### 6. GitOps: Argo CD

**Argo CD** in the cluster keeps it equal to `deploy/k8s` on `main`; a deploy is a commit, and a rollback is `git revert` of that commit.

1. A merge to `main` → `images.yml` builds the images tagged with the short SHA and runs the migrate smoke test.
2. Its `deploy` job replaces the tag in the `image:` lines of `deploy/k8s` with `sed` and pushes `build(deploy): images <sha>` to `main` as `github-actions[bot]`. The commit touches only `deploy/`, so `images.yml` does not run again.
3. Argo CD polls the repository every 3 minutes, sees the new tags and syncs in waves: everything else (wave 0) → the migrate `Job` as a `Sync` hook, recreated on every sync (wave 1) → `frontend` and the services (wave 2) → the Ingress (wave 3), so a path switches to a new service only after its pods are ready. A failed migration stops the sync, and the old pods keep running.

| File                               | Purpose                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `deploy/helm/argocd-values.yaml`   | Argo CD chart without dex, notifications and the ApplicationSet controller (memory); the install command is at the top      |
| `deploy/argocd/restaurant.yaml`    | `Application` `restaurant`: repo, `main`, `deploy/k8s` → namespace `restaurant`; automated sync with `prune` and `selfHeal` |
| `argocd.argoproj.io/*` annotations | in `01` (the namespace is never pruned), `03` (hook, wave 1), `04`/`05`/`08`/`09`/`10` (wave 2), `07` (wave 3)              |

- Secrets created by hand and `restaurant-tls` are not in git; Argo CD did not create them, so `prune` leaves them alone.
- `selfHeal` reverts manual `kubectl` changes to resources from `deploy/k8s`; change the files instead. To pause it, turn off auto-sync in the UI.
- No Ingress for Argo CD: `kubectl -n argocd port-forward svc/argocd-server 8443:443` → https://localhost:8443, user `admin`, password from `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"` (base64).
- Traefik and cert-manager stay Helm releases installed by hand; they could become Argo CD applications or Terraform `helm_release` later.

Order: the Argo CD chart → `kubectl apply -f deploy/argocd/restaurant.yaml` (after `deploy/` is on `main`).

Check: `kubectl -n argocd get applications` shows `restaurant` as `Synced` and `Healthy`; after a merge to `main`, the bot commit appears and `kubectl -n restaurant get pods` shows new pods with the new tag.

### 7. OpenTelemetry

- Backend: `@opentelemetry/sdk-node` with auto-instrumentations for HTTP, Express, NestJS and `pg`, plus `@prisma/instrumentation`; service name and version as resource attributes; logs correlated with trace IDs.
- **Bundling:** the backend services are bundled by webpack, and auto-instrumentation patches modules through `require` hooks, which do not see bundled code. Either keep the instrumented packages external in the webpack config or start the SDK with `node --require` before the bundle; verify that spans actually appear.
- SSE: do not keep one span open for the whole stream; trace the connect and the events.
- Frontend (later): `@opentelemetry/sdk-trace-web` with fetch instrumentation and `traceparent` propagation to `/api`.
- Export over OTLP to an **OpenTelemetry Collector** in the cluster, then to **Grafana Cloud** (free tier) or a self-hosted `grafana/otel-lgtm` (tight on two 6 GB nodes).
- New env variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`) go into `.env.example`; the SDK is off when no endpoint is set.

### 8. Several backend replicas

Replace the in-memory `EventBus` with PostgreSQL `LISTEN/NOTIFY` (no new infrastructure) or Redis pub/sub, and move the order-status timer to a single worker or a database-driven job. Then: `replicas: 2+`, `RollingUpdate`, a `PodDisruptionBudget`, an HPA. See [production-readiness.md](production-readiness.md#real-time-at-scale). The microservices plan ([microservices.md](microservices.md), stage B) solves this with Kafka instead.

## Open questions

- **Demo data in public:** a production seed with the menu and one admin whose password comes from a secret, or demo users with read-only behaviour, or no public admin at all.
- **Secrets in git:** Sealed Secrets or SOPS instead of `kubectl create secret` by hand.
- **Backups:** a `CronJob` with `pg_dump` to Object Storage (free S3-compatible storage), or the CloudNativePG operator instead of the plain `StatefulSet`.
- **Terraform state:** local now; an OCI Object Storage bucket as a remote backend if more than one machine runs Terraform.
- **Selective builds and deploys:** every merge rebuilds all images and restarts every pod; building and rolling out only the changed services is planned after the service split ([microservices.md](microservices.md#later-build-and-deploy-only-what-changed)).
- **Telemetry backend:** Grafana Cloud (nothing to run) or self-hosted LGTM (more practice, more memory).
