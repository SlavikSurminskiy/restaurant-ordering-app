# Frontend image: the Angular build served by nginx; Traefik routes /api to the services.
# Build from the repository root:
#   docker build -f apps/frontend/Dockerfile -t restaurant-frontend .

FROM node:24-slim AS build
WORKDIR /repo
ENV CI=true \
    NX_DAEMON=false \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# pnpm version comes from "packageManager" in package.json.
RUN corepack enable

# Manifests first: this layer is rebuilt only when dependencies change, not on every code change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/orders-service/package.json apps/backend/orders-service/
COPY apps/frontend/package.json apps/frontend/
COPY libs/database/package.json libs/database/
COPY libs/shared/api-types/package.json libs/shared/api-types/
COPY libs/shared/utils/package.json libs/shared/utils/
# --ignore-scripts skips the root postinstall (prisma generate), which needs the sources and
# which the frontend does not use.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir /pnpm/store

COPY . .
RUN pnpm nx build frontend --configuration=production


# Runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
# The image's entrypoint copies templates/ into conf.d/ on start (and fills in ${VAR}s, none now).
COPY apps/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/dist/apps/frontend/browser /usr/share/nginx/html
EXPOSE 8080
