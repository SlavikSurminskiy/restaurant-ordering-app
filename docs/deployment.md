# Deployment

Steps 1–5 are in place: the app is deployed to OKE (Oracle Kubernetes Engine) in Oracle Cloud Always Free, created with Terraform, at https://92-5-5-205.sslip.io. Steps 6–8 are still a plan. The goal is a free public deployment that doubles as Kubernetes practice. Free-tier terms change often; check them before changing sizes or shapes.

## Constraints from the current code

| Constraint                                                                                               | Consequence                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/events` is a long-lived SSE stream                                                             | No platforms with short request timeouts or buffering rewrites (Vercel/Netlify rewrites). Every proxy on the path must not buffer `/api/events`.   |
| `EventBus` is in memory, and order statuses advance on an in-process timer                               | Exactly **one** backend replica until the bus is shared (see [step 8](#8-several-backend-replicas)). Scale-to-zero platforms also pause the timer. |
| The frontend calls `/api` on its own origin (`proxy.conf.mjs` in development)                            | Serve frontend and API from one origin: nginx in front of the backend, so no CORS and the `lax` auth cookie keeps working.                         |
| The auth cookie is `Secure` only when `NODE_ENV=production`                                              | Deployed environments set `NODE_ENV=production` and serve over HTTPS.                                                                              |
| `prisma migrate deploy` and the seed need the Prisma CLI, `prisma.config.ts` and the migrations          | The runtime image (`dist/apps/backend`) does not have them; migrations run from a separate image as a release step.                                |
| The seed creates demo users with known passwords, including an admin, and resets demo orders on each run | A public deployment must not run the development seed as is (see [open questions](#open-questions)).                                               |

## Platform options

| Option                                   | Fits                                        | Limits                                                                                     |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Render or Koyeb (Docker) + Neon Postgres | Quickest public link                        | Free services sleep after inactivity: cold starts, dropped SSE, paused order-status timer. |
| Google Cloud Run + Neon                  | Containers with SSE (timeouts up to 60 min) | Billing account required; `max-instances=1` because of the in-memory bus.                  |
| **Oracle Cloud Always Free + OKE**       | Real managed Kubernetes, always on          | ARM (arm64) nodes only; A1 capacity per region can run out.                                |

**Chosen path:** container images → CI to GHCR → OKE created with Terraform → plain manifests applied one by one → HTTPS with Traefik and cert-manager → OpenTelemetry, with Postgres inside the cluster. The main goal is hands-on practice, so there is no managed database and no Kustomize or Helm chart of our own: each file is applied and checked before the next.

## Steps

### 1. Container images

- `apps/backend/Dockerfile`, multi-stage: `pnpm install --frozen-lockfile` → `nx run backend:prepare-deploy` → runtime stage on `node:24-slim` with `main.js`, `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` from `dist/apps/backend` and `pnpm install --prod --frozen-lockfile`, a non-root user, `NODE_ENV=production`. See [architecture.md](architecture.md#deploy-output).
- `apps/frontend/Dockerfile`: `nx build frontend` → `nginx` serving the static files with an SPA fallback to `index.html`, and proxying `/api` to the backend service. For `/api/events`: `proxy_buffering off`, `proxy_read_timeout` above the 20 s heartbeat, HTTP/1.1 to the upstream.
- `libs/database/Dockerfile`: a migrate image with only the Prisma CLI (root `package.json` version), `libs/database/prisma` and `prisma.config.ts`; its command is `prisma migrate deploy`.
- `.dockerignore`: `node_modules`, `dist`, `.nx`, `.env*`, `libs/database/src/generated`.
- Check: `docker-compose.prod.yml` runs Postgres → migrate → backend → frontend locally on http://localhost:8080 ([how](development.md#production-like-stack)).

### 2. CI: images to a registry

`.github/workflows/images.yml`:

- Runs on pull requests, on pushes to `main` and manually (`workflow_dispatch`); changes only to docs, Markdown or `deploy/` don't trigger it.
- Builds the three images for `linux/arm64` only (Oracle A1 is ARM) on an ARM runner (`ubuntu-24.04-arm`, free for public repositories), so nothing runs under QEMU. They don't run on amd64 nodes; adding `linux/amd64` later means QEMU with `FROM --platform=$BUILDPLATFORM` for the build stages, or a build per platform joined into one multi-arch tag.
- Pushes to `ghcr.io/slaviksurminskiy/restaurant-{backend,frontend,migrate}` with the built-in `GITHUB_TOKEN`, tagged with the short SHA of the commit (for a PR, its last commit, not GitHub's merge commit), plus `main` on the main branch. The packages are public, so the cluster pulls them without credentials.
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

| File                  | Resources                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `01-namespace.yaml`   | `Namespace` `restaurant`                                                                                                       |
| `02-postgres.yaml`    | headless `Service` `db` + `StatefulSet` `pg-server` (Postgres 18) with a 50 GB PVC on the default `oci-bv` storage class       |
| `03-migrate-job.yaml` | `Job` with the migrate image (`prisma migrate deploy`); no seed                                                                |
| `04-backend.yaml`     | `ConfigMap` `backend-config`, `Deployment` `backend` (`replicas: 1`, `strategy: Recreate`, probes on `/api/health`), `Service` |
| `05-frontend.yaml`    | `Deployment` + `Service` `frontend` (nginx; proxies `/api` to `backend`)                                                       |

Secrets are not in the repository. Create them after the namespace and before `02-postgres.yaml`:

```bash
kubectl apply -f deploy/k8s/01-namespace.yaml
kubectl -n restaurant create secret generic postgres \
  --from-literal=POSTGRES_USER=restaurant --from-literal=POSTGRES_DB=restaurant \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 24)"
kubectl -n restaurant create secret generic backend --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
```

A new release: change the image tags in `03`–`05`, delete the finished `Job` (its template can't be changed) and apply `03`, then `04` and `05`.

Check: `kubectl -n restaurant get pods` shows `pg-server-0`, `backend-…`, `frontend-…` as `Running` and the migrate pod as `Completed`; `kubectl -n restaurant port-forward svc/frontend 8080:80` opens the app on http://localhost:8080.

### 5. HTTPS: Traefik and cert-manager

Both are installed with Helm from their OCI registries (no `helm repo add`); the exact commands are at the top of each values file in `deploy/helm/`.

- **Traefik** (`traefik-values.yaml`) is the ingress controller. Its `LoadBalancer` Service becomes an OCI load balancer in the `restaurant-lb` subnet; annotations keep it in Always Free (flexible, 10 Mbps) and stop OKE from editing the security list that Terraform owns. TLS ends in Traefik, and port 80 redirects to HTTPS with the lowest router priority, so the ACME challenge route still wins there.
- **cert-manager** (`cert-manager-values.yaml`, CRDs installed with the chart) gets certificates from Let's Encrypt with the HTTP-01 challenge and renews them.
- `06-cluster-issuer.yaml`: `ClusterIssuer`s `letsencrypt-staging` (for debugging, high rate limits) and `letsencrypt-prod`.
- `07-ingress.yaml`: host `92-5-5-205.sslip.io` (sslip.io resolves it to the load balancer's IP, so no domain is needed) → `frontend`, only on the HTTPS entrypoint; cert-manager puts the certificate into the `restaurant-tls` Secret. A new load balancer gets a new IP, and then the host must change.

Order: Traefik → read the IP with `kubectl -n traefik get svc traefik` → cert-manager → `06` → `07`.

Check: `kubectl -n restaurant get certificate` shows `READY True`; `curl -I http://92-5-5-205.sslip.io/` answers `301` to HTTPS; log in, open the menu in two tabs, change a dish and see it update live; the auth cookie is `Secure`.

### 6. GitOps (optional)

**Argo CD** in the cluster watches `deploy/k8s`; CI updates the image tags (a commit or Argo CD Image Updater). Deploys become a merge, and rollback is a revert. Traefik and cert-manager could move to Terraform `helm_release` or to Argo CD applications at the same time.

### 7. OpenTelemetry

- Backend: `@opentelemetry/sdk-node` with auto-instrumentations for HTTP, Express, NestJS and `pg`, plus `@prisma/instrumentation`; service name and version as resource attributes; logs correlated with trace IDs.
- **Bundling:** the backend is bundled by webpack, and auto-instrumentation patches modules through `require` hooks, which do not see bundled code. Either keep the instrumented packages external in the webpack config or start the SDK with `node --require` before the bundle; verify that spans actually appear.
- SSE: do not keep one span open for the whole stream; trace the connect and the events.
- Frontend (later): `@opentelemetry/sdk-trace-web` with fetch instrumentation and `traceparent` propagation to `/api`.
- Export over OTLP to an **OpenTelemetry Collector** in the cluster, then to **Grafana Cloud** (free tier) or a self-hosted `grafana/otel-lgtm` (tight on two 6 GB nodes).
- New env variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`) go into `.env.example`; the SDK is off when no endpoint is set.

### 8. Several backend replicas

Replace the in-memory `EventBus` with PostgreSQL `LISTEN/NOTIFY` (no new infrastructure) or Redis pub/sub, and move the order-status timer to a single worker or a database-driven job. Then: `replicas: 2+`, `RollingUpdate`, a `PodDisruptionBudget`, an HPA. See [production-readiness.md](production-readiness.md#real-time-at-scale).

## Open questions

- **Demo data in public:** a production seed with the menu and one admin whose password comes from a secret, or demo users with read-only behaviour, or no public admin at all.
- **Secrets in git:** Sealed Secrets or SOPS instead of `kubectl create secret` by hand.
- **Backups:** a `CronJob` with `pg_dump` to Object Storage (free S3-compatible storage), or the CloudNativePG operator instead of the plain `StatefulSet`.
- **Terraform state:** local now; an OCI Object Storage bucket as a remote backend if more than one machine runs Terraform.
- **Telemetry backend:** Grafana Cloud (nothing to run) or self-hosted LGTM (more practice, more memory).
