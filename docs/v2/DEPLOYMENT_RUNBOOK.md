# Production deployment runbook

ShopMind uses the production topology already referenced by the project
documentation:

```text
Vercel                 Northflank
web                    API + BullMQ worker
  |                       |
  +------ HTTPS ----------+
                          |
                managed PostgreSQL/pgvector
                managed Redis/Valkey
```

The repository automates releases through `.github/workflows/cd.yml`. A
successful `CI` run on `main` builds one immutable backend image, publishes it
to GHCR, applies forward-only Prisma migrations, triggers the two Northflank
services and the Vercel project, then checks the public API and web URLs.

The workflow is intentionally disabled until the production environment is
configured. Set the repository variable `ENABLE_PRODUCTION_DEPLOY=true` only
after every item below is ready.

## 1. GitHub production environment

Create a GitHub Environment named `production`. Add a required reviewer when
production changes need manual approval.

Environment secrets:

| Name | Purpose |
|---|---|
| `PRODUCTION_DATABASE_URL` | Migration-only connection string for managed PostgreSQL with pgvector. |
| `NORTHFLANK_API_DEPLOY_HOOK_URL` | Northflank deploy hook for the API service. |
| `NORTHFLANK_WORKER_DEPLOY_HOOK_URL` | Northflank deploy hook for the worker service. |
| `VERCEL_DEPLOY_HOOK_URL` | Vercel deploy hook configured for branch `main`. |

Repository variables:

| Name | Example |
|---|---|
| `ENABLE_PRODUCTION_DEPLOY` | `true` only after setup is complete |
| `PRODUCTION_API_HEALTH_URL` | `https://api.example.com/api/v1/health` |
| `PRODUCTION_WEB_URL` | `https://shop.example.com` |

Never store hook URLs, database credentials, provider keys or JWT secrets in
Git. Deploy hooks are credentials and must be rotated if exposed.

## 2. Northflank services

Create two services from the same image:

```text
ghcr.io/luciusvie2712/shopmind-api:main
```

Configure a GHCR pull credential in Northflank if the package remains private.
The CD workflow also publishes an immutable tag equal to the Git commit SHA.

API service:

```text
command: node apps/api/dist/main.js
port: 4000
health: /api/v1/health
```

Worker service:

```text
command: node apps/api/dist/worker.js
no public port
```

Both services must receive the same application configuration where relevant:

```text
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_ACCESS_TTL
REFRESH_TOKEN_TTL_DAYS
COOKIE_SECURE=true
DUMMYJSON_BASE_URL
PRODUCT_SOURCE_PROVIDER
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_EMBEDDING_MODEL
GEMINI_EMBEDDING_DIMENSION=768
AI_TIMEOUT_MS
AI_MAX_TOOL_STEPS
AI_FALLBACK_PROVIDER
AI_FALLBACK_TOTAL_TIMEOUT_MS
MULTIMODAL_MAX_UPLOAD_BYTES
STRIPE_TEST_MODE_ENABLED
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CURRENCY
DEMO_PAYMENT_ENABLED
DEMO_FULFILLMENT_ENABLED
DEMO_FULFILLMENT_RECEIVED_TO_TRANSIT_MS
DEMO_FULFILLMENT_TRANSIT_TO_OUT_FOR_DELIVERY_MS
DEMO_FULFILLMENT_OUT_FOR_DELIVERY_TO_FINAL_MS
DEMO_FULFILLMENT_DEFAULT_SCENARIO
WEB_ORIGIN
NODE_ENV=production
```

Set `API_PORT=4000` on the API. The worker may use the same value even though it
does not expose the port. `WEB_ORIGIN` must be the exact public Vercel/custom
domain origin without a path. API and worker must use the same PostgreSQL and
Redis services.

Configure each deploy hook to redeploy its service from the `main` image tag.
The immutable SHA tag recorded in the GitHub deployment summary is the rollback
reference.

## 3. Vercel project

Connect the GitHub repository to Vercel with `apps/web` as the project Root
Directory and allow access to source files outside that directory so the pnpm
workspace can build `packages/contracts`. `apps/web/vercel.json` supplies the
monorepo install/build commands and uses `.next` relative to that Root
Directory.

Leave the Vercel Output Directory project setting empty/default. If an override
is required, set it to `.next`, never `apps/web/.next`; Vercel already resolves
the value from `/vercel/path0/apps/web`.

Required web variable:

```text
SHOPMIND_API_BASE_URL=https://api.example.com/api/v1
```

Optional public contact and Stripe publishable variables may be copied from
`.env.example`. Never add backend secrets or `DATABASE_URL` to Vercel.

Create a deploy hook targeting `main` and store it as
`VERCEL_DEPLOY_HOOK_URL` in the GitHub `production` environment.

## 4. Managed data services

Before enabling CD:

1. Provision PostgreSQL 16 with pgvector support.
2. Provision Redis/Valkey compatible with BullMQ.
3. Allow the Northflank API and worker to reach both services.
4. Allow the GitHub-hosted migration job to reach PostgreSQL, or use a
   narrowly scoped migration endpoint/network rule.
5. Confirm TLS requirements in both connection strings.

The migration job executes `prisma migrate deploy` before triggering service
deployments. Migrations are forward-only and must remain compatible with the
currently running revision during the rollout window.

## 5. First release

1. Configure the managed services, Northflank services and Vercel project.
2. Add the GitHub environment secrets and variables.
3. Keep `ENABLE_PRODUCTION_DEPLOY` unset while validating the configuration.
4. Set `ENABLE_PRODUCTION_DEPLOY=true`.
5. Run `CD` manually once or push a verified change to `main`.
6. Check the image digest, migration output, deploy-hook responses and health
   checks in the GitHub job summary.
7. Run the production smoke checklist in `EXTERNAL_ACTIONS_REQUIRED.md`.

Normal deployments are triggered only after `CI` succeeds on `main`. A failed
or cancelled CI run cannot start the production job.

## 6. Rollback

Application rollback:

1. Find the last healthy SHA/image digest in a successful CD summary.
2. Point both Northflank services to the same SHA tag.
3. Redeploy API and worker together.
4. Verify `/api/v1/health`, Redis/BullMQ processing and the public web flow.

Vercel rollback uses its previous production deployment. Database migrations
are not automatically reversed. If a migration is not backward compatible,
stop the release and create a reviewed forward repair migration rather than
running ad-hoc destructive SQL.

## 7. Operational verification

At minimum verify:

- API and web health checks are HTTPS and return 2xx;
- register/login/refresh/logout;
- catalog, keyword and semantic search;
- AI search, compare and read-only assistant;
- cart, wishlist, checkout and orders;
- both demo fulfillment terminal scenarios;
- product import and embedding worker completion;
- no secret values appear in GitHub, Northflank or application logs.
