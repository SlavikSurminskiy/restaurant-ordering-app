# Migration image: applies pending migrations to DATABASE_URL (`prisma migrate deploy`) and exits.
# Build from the repository root:
#   docker build -f libs/database/Dockerfile -t restaurant-migrate .

FROM node:24-slim
WORKDIR /app
ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# No OpenSSL: without it Prisma picks the openssl-1.1.x schema engine, which does not link libssl
# and runs on the bare slim image (it only logs a "failed to detect libssl" warning).
RUN corepack enable

# A package.json with only the Prisma CLI, at the version from the root package.json. The root
# lockfile keeps every transitive dependency at its monorepo version, and pnpm-workspace.yaml
# brings the same install settings (build-script approvals, supply-chain policy).
COPY package.json /tmp/root-package.json
COPY libs/database/scripts/migrate-package-json.mjs /tmp/
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN node /tmp/migrate-package-json.mjs /tmp/root-package.json package.json
# --no-frozen-lockfile: the lockfile is the monorepo's, so pnpm prunes it to this package.json.
# --no-optional leaves out Prisma Studio's optional peers (React and others).
# --config.side-effects-cache=false: run @prisma/engines' postinstall here instead of reusing its
# result from the shared store, which may come from an image with another OpenSSL setup and hold
# a schema engine for the wrong platform.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    --mount=type=cache,id=corepack,target=/root/.cache/node/corepack \
    --mount=type=cache,id=prisma-engines,target=/root/.cache/prisma \
    pnpm install --prod --no-frozen-lockfile --no-optional --store-dir /pnpm/store \
      --config.side-effects-cache=false

COPY libs/database/prisma.config.ts ./
COPY libs/database/prisma ./prisma

USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]
