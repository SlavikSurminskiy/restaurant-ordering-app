# Frontend image: the Angular build served by nginx, which also proxies /api to the backend.
# Build from the repository root:
#   docker build -f apps/frontend/Dockerfile -t restaurant-frontend .
# BACKEND_URL (default http://backend:3000) is where nginx sends /api.

FROM node:24-slim AS build
WORKDIR /repo
ENV CI=true \
    NX_DAEMON=false \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# pnpm version comes from "packageManager" in package.json.
RUN corepack enable

# Manifests first: this layer is rebuilt only when dependencies change, not on every code change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
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
ENV BACKEND_URL=http://backend:3000
# The image's entrypoint fills in ${BACKEND_URL} from templates/ into conf.d/ on start.
COPY apps/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/dist/apps/frontend/browser /usr/share/nginx/html
EXPOSE 8080
