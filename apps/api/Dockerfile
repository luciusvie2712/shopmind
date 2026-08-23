FROM node:24.15.0-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@10.15.0 --activate

WORKDIR /workspace

FROM base AS manifests

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

FROM manifests AS build

RUN pnpm install --frozen-lockfile --filter api... --filter @shopmind/contracts

COPY apps/api apps/api
COPY packages/contracts packages/contracts
COPY prisma prisma

RUN mkdir -p node_modules/@prisma \
    && ln -sfn ../../apps/api/node_modules/@prisma/client node_modules/@prisma/client \
    && PRISMA_GENERATE_SKIP_AUTOINSTALL=true pnpm --filter api prisma:generate \
    && pnpm --filter @shopmind/contracts build \
    && pnpm --filter api build

FROM manifests AS production-dependencies

RUN pnpm install --prod --frozen-lockfile --filter api... --filter @shopmind/contracts

COPY prisma prisma

RUN mkdir -p node_modules/@prisma \
    && ln -sfn ../../apps/api/node_modules/@prisma/client node_modules/@prisma/client \
    && PRISMA_GENERATE_SKIP_AUTOINSTALL=true pnpm --filter api prisma:generate

FROM base AS runtime

ENV NODE_ENV=production

COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/api/package.json apps/api/package.json
COPY --chown=node:node packages/contracts/package.json packages/contracts/package.json
COPY --chown=node:node prisma prisma

USER node

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
