# Backend image. Build from the repository root:
#   docker build -f apps/backend/Dockerfile -t restaurant-backend .

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
# --ignore-scripts skips the root postinstall: prisma generate needs the sources, and the build
# runs it anyway as a dependency.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir /pnpm/store

COPY . .
RUN pnpm nx run backend:prepare-deploy


FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY --from=build /repo/dist/apps/backend/package.json /repo/dist/apps/backend/pnpm-lock.yaml /repo/dist/apps/backend/pnpm-workspace.yaml ./
# --no-optional skips optional dependencies and optional peers. The lockfile comes from the
# monorepo, where pnpm linked the optional peers `prisma` (CLI with Studio and React) and
# `typescript` to @prisma/client; unused at runtime, they are most of node_modules.
# A package that ships native binaries as optionalDependencies would need this revisited.
# pnpm's metadata cache (fetched for the supply-chain policy check) and pnpm itself (downloaded
# by Corepack) are mounted too, so they stay out of the layer.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    --mount=type=cache,id=corepack,target=/root/.cache/node/corepack \
    pnpm install --prod --frozen-lockfile --no-optional --store-dir /pnpm/store
COPY --from=build /repo/dist/apps/backend/main.js ./

USER node
EXPOSE 3000
# Exec form: node runs as PID 1 and receives SIGTERM for a graceful shutdown.
CMD ["node", "main.js"]
