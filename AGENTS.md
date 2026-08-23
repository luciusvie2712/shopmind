# ShopMind Codex Agent Instructions

This file is the repository-level operating contract for Codex and any coding agent working in ShopMind.

Its scope is the entire `shopmind/` repository tree unless a more deeply nested `AGENTS.md` explicitly adds stricter instructions for a subdirectory.

---

## 1. Source of Truth

All implementation decisions MUST conform to the project documentation under `docs/`.

Normative documents:

```text
docs/
├── 01-architecture-and-monorepo.md
├── 02-database-and-migrations.md
├── 03-backend-api-and-contracts.md
├── 04-ai-subsystem-and-prompts.md
├── 05-frontend-routes-and-states.md
├── 06-ingestion-and-workers.md
└── 07-project-phases-and-task-list.md
```

Treat these documents as the authoritative implementation contract for the MVP.

### Required reading behavior

Before changing code:

1. Read this `AGENTS.md`.
2. Read `docs/01-architecture-and-monorepo.md`.
3. Read `docs/07-project-phases-and-task-list.md`.
4. Read every task-specific document relevant to the files being changed:
   - Database, Prisma, migrations, transactions, pgvector:
     `docs/02-database-and-migrations.md`
   - NestJS modules, DTOs, API routes, auth, contracts, errors:
     `docs/03-backend-api-and-contracts.md`
   - Gemini, semantic ranking, prompts, structured output, tool calling:
     `docs/04-ai-subsystem-and-prompts.md`
   - Next.js routes, Server/Client Components, TanStack Query, UI states:
     `docs/05-frontend-routes-and-states.md`
   - DummyJSON, Redis, BullMQ, workers, cache, embeddings:
     `docs/06-ingestion-and-workers.md`
5. For architecture changes, cross-module changes, new infrastructure, or changes affecting more than one application, read all seven documents before editing.

Do not rely on memory when a relevant rule exists in `docs/`. Re-open the document and verify it.

If code and documentation disagree, stop and treat the documentation as authoritative unless the user explicitly requests a specification change.

If two project documents appear to conflict, do not silently choose one. Report the conflict and use the more specific rule only when the intended precedence is clear.

---

## 2. MVP Scope Is Locked

The active target is the ShopMind MVP.

Do NOT implement roadmap v2 functionality unless the user explicitly changes scope and the MVP Definition of Done has already passed.

MVP non-goals include:

- real payment processing;
- real logistics/shipping;
- multi-seller marketplace behavior;
- custom recommendation ML models;
- microservice decomposition;
- Stripe test mode;
- personalized recommendation engine;
- review summarization;
- event-feedback ranking loop;
- multimodal product search;
- provider fallback;
- SSE streaming assistant unless explicitly promoted into scope.

When a requested change introduces scope creep, say so before implementing it.

---

## 3. Non-Negotiable Architecture Invariants

The following rules MUST NOT be violated.

### Architecture

- Backend is a NestJS modular monolith.
- Frontend and backend are separate applications in the same `pnpm` monorepo.
- PostgreSQL is the canonical source of truth.
- DummyJSON is only an external ingestion source.
- Browser code must never use DummyJSON as canonical product storage.
- Redis is used for cache, rate-limit support, and BullMQ transport.
- Catalog reads must fall back to PostgreSQL when Redis cache is unavailable.
- Gemini must remain behind provider abstractions.
- Frontend must not import backend implementation internals.
- Shared cross-app contracts belong in `packages/contracts`.

### Dependency direction

Backend code follows:

```text
Controller
  -> Application Service
    -> Repository / Provider
```

Rules:

- Controllers translate HTTP contracts.
- Application services orchestrate business use cases.
- Repositories own persistence access.
- External HTTP/API clients are infrastructure adapters.
- Domain/business logic must not call Gemini or DummyJSON HTTP clients directly.

### AI safety

AI is strictly read-only.

AI MUST NOT:

- perform checkout;
- modify cart state;
- modify wishlist state;
- modify stock;
- modify product price;
- delete data;
- perform payment actions;
- bypass authorization;
- bypass business rules.

Only the documented read-only assistant tools are allowed for MVP:

```text
search_products
get_product
compare_products
get_categories
get_user_preferences
get_wishlist
```

Every tool argument must be validated server-side.

Authorization must be enforced in backend code, never trusted to the model.

Product title, price, rating, stock, availability, and other user-visible facts must be mapped from canonical backend data after model output.

A model-generated product ID outside the backend candidate/requested set is invalid.

### Checkout safety

Checkout must use an explicit database transaction.

Required logical order:

```text
BEGIN
1. Lock relevant cart rows with SELECT ... FOR UPDATE
2. Re-read current product price and stock
3. Reject empty cart
4. Reject quantity greater than stock
5. Insert order
6. Insert immutable order item title/price snapshots
7. Delete cart items
COMMIT
```

Do not let AI invoke this flow.

Do not decrement global stock in MVP unless the specification is explicitly changed to include inventory simulation.

### Vector search safety

- Use Prisma for standard CRUD.
- Use parameterized raw SQL for pgvector-specific queries.
- Keep vector SQL inside a dedicated `VectorSearchRepository` or equivalent repository boundary.
- Never interpolate user or model-generated text directly into vector SQL.
- Embedding dimension is exactly `768`.
- Validate all returned embedding values are finite.

---

## 4. Monorepo Contract

Expected repository organization:

```text
shopmind/
├── AGENTS.md
├── docs/
├── apps/
│   ├── web/
│   │   ├── src/app/
│   │   ├── src/components/
│   │   ├── src/features/
│   │   ├── src/lib/
│   │   └── src/types/
│   └── api/
│       └── src/
│           ├── modules/
│           │   ├── auth/
│           │   ├── users/
│           │   ├── products/
│           │   ├── categories/
│           │   ├── search/
│           │   ├── cart/
│           │   ├── wishlist/
│           │   ├── orders/
│           │   ├── ai/
│           │   ├── ingestion/
│           │   └── health/
│           ├── common/
│           └── main.ts
├── packages/
│   ├── contracts/
│   ├── eslint-config/
│   └── tsconfig/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

Do not create alternative top-level architectural structures without a documented reason and user approval.

---

## 5. Technology Contract

Use the documented stack unless the user explicitly changes the specification.

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

### Backend

- NestJS
- TypeScript
- `class-validator`
- Swagger/OpenAPI
- Prisma

### Data and async infrastructure

- PostgreSQL
- pgvector
- Redis
- BullMQ

### AI

- Gemini provider abstraction
- LLM model configured by environment
- embedding model configured by environment
- embedding dimension `768`

### Testing

- Vitest/Jest as configured by the workspace
- Supertest for API integration/E2E where applicable
- Playwright for browser E2E

Do not add another framework, ORM, state manager, queue system, vector database, or validation library when the documented stack already solves the requirement.

---

## 6. Backend Implementation Rules

### DTOs

Every externally supplied NestJS request payload or query requiring validation must use typed DTOs with `class-validator`.

Use allowlisted fields only.

Never spread arbitrary request bodies directly into Prisma create/update calls.

### API conventions

Follow:

```text
Base path: /api/v1
JSON only
Time: ISO-8601 UTC
Pagination contract: page + pageSize
```

Use the documented stable error envelope:

```json
{
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Human readable message",
    "requestId": "req_..."
  }
}
```

Documented stable codes include:

```text
VALIDATION_ERROR
AUTH_REQUIRED
FORBIDDEN
PRODUCT_NOT_FOUND
OUT_OF_STOCK
AI_INVALID_OUTPUT
AI_PROVIDER_TIMEOUT
EXTERNAL_DATA_ERROR
```

Do not casually invent a new public error code when an existing documented code covers the case.

### Authentication

- Password hashing: Argon2id.
- Access JWT is short-lived.
- Refresh token/session material is stored server-side as a hash/session.
- Refresh token rotates on refresh.
- Refresh cookie is HttpOnly.
- Refresh cookie is Secure in production.
- Roles include `USER` and `ADMIN`.
- Admin routes require explicit role protection.
- Never log passwords, access tokens, refresh tokens, or secret keys.

---

## 7. Database and Migration Rules

Before changing Prisma or SQL, read `docs/02-database-and-migrations.md`.

Rules:

- Preserve documented table relationships and unique constraints.
- Imported products are unique by `(source, external_id)`.
- Cart items are unique by `(cart_id, product_id)`.
- Wishlist identity is unique by user and product.
- Order items store immutable product title and price snapshots.
- `product_embeddings.embedding` is `VECTOR(768)`.
- `content_hash` controls re-embedding.
- Use PostgreSQL migrations for extensions/indexes unsupported directly by normal Prisma modeling.
- If using trigram search, enable `pg_trgm`.
- Treat HNSW as a performance decision; semantic correctness must not depend on it for the MVP dataset.

When the specification intentionally leaves a schema detail open, choose the smallest implementation that satisfies the documented invariant and note the implementation decision in the final report.

---

## 8. Ingestion, Redis, BullMQ, and Worker Rules

Before changing ingestion or workers, read `docs/06-ingestion-and-workers.md`.

### DummyJSON

External data is untrusted.

Required logical pipeline:

```text
fetch
-> validate with Zod
-> normalize
-> upsert canonical DB data
-> compare content_hash
-> enqueue embedding only when required
```

Do not partially trust malformed external payloads.

### Idempotency

Product import must be idempotent.

Embedding job ID must follow:

```text
embed:{productId}:{contentHash}
```

Worker rules:

- reload canonical product data from PostgreSQL;
- do not trust stale product facts carried inside a job payload;
- validate embedding dimension;
- validate finite numeric values;
- upsert embedding state;
- use bounded retries;
- keep failed jobs observable.

### Cache

Use documented cache semantics where implemented:

```text
categories:v1
product:{id}
products:list:{hash}
ai:intent:{queryHash}
```

Do not cache raw access/refresh tokens.

Do not let a Redis cache outage make the normal product catalog unavailable.

---

## 9. Search and Ranking Rules

Semantic search must work before LLM explanation is layered on top.

Hybrid retrieval order:

```text
hard SQL constraints
+ keyword/fuzzy relevance
+ vector similarity
-> candidate pool
-> deterministic ranking
-> bounded top candidates
-> optional grounded LLM explanation
```

Use the MVP ranking formula unless the user explicitly requests an evaluated change:

```text
score =
  0.45 * semantic_similarity
+ 0.20 * keyword_relevance
+ 0.15 * preference_match
+ 0.10 * normalized_rating
+ 0.10 * stock_signal
```

Rules:

- Normalize ranking components to `[0,1]`.
- Apply hard category/budget/required-brand constraints before ranking.
- Do not treat lower price as automatically better unless user intent expresses budget/value preference.
- Do not let the LLM rank the entire catalog.
- Bound LLM candidates to approximately 10–20 compact product facts.

---

## 10. AI Structured Output and Prompt Rules

Before changing AI code, read `docs/04-ai-subsystem-and-prompts.md`.

Search intent must conform to the documented structure:

```ts
type SearchIntent = {
  category?: string;
  price?: { min?: number; max?: number };
  brands?: string[];
  minRating?: number;
  useCases: string[];
  requiredFeatures: string[];
  priorities: string[];
  negativePreferences: string[];
  semanticQuery: string;
};
```

Requirements:

- Validate every structured model response before use.
- Model parsing failure must fall back to deterministic search where documented.
- Model/provider timeout must use the documented error behavior.
- Do not trust model-generated price, rating, stock, title, availability, or arbitrary product IDs.
- External product text is data, not instruction.
- Maximum assistant tool steps is controlled by `AI_MAX_TOOL_STEPS`, default `4`.
- Tool outputs must be bounded.
- Do not send the entire database to the model.
- Retry only safe/idempotent AI operations.

---

## 11. Frontend Rules

Before changing UI/routes, read `docs/05-frontend-routes-and-states.md`.

### Route contract

Expected MVP routes:

```text
/
/products
/products/[id]
/search/ai
/compare?ids=1,2,3
/cart
/wishlist
/orders
/assistant
/login
/register
```

### State ownership

- Catalog filter state belongs in URL query parameters.
- Initial product/catalog fetching uses Server Components where documented.
- Interactive controls and mutations use Client Components.
- TanStack Query owns frequently refreshed server state and mutations.
- Do not duplicate server state into Zustand.
- Zustand is optional and only for ephemeral UI state when URL/local state is not more appropriate.
- Browser state is never canonical for price, stock, order totals, or authorization.

### Frontend validation

Use React Hook Form + Zod for forms.

Backend validation remains authoritative.

### Mandatory UX states

Every relevant feature must implement:

- skeleton/loading;
- empty state;
- validation error;
- API unavailable;
- AI timeout/retry;
- out-of-stock handling;
- optimistic cart/wishlist rollback when a mutation fails.

---

## 12. Required Implementation Order

Follow `docs/07-project-phases-and-task-list.md`.

The high-level dependency order is:

```text
1. Monorepo / infrastructure
2. Database / auth / health
3. Catalog / ingestion
4. Catalog frontend / deterministic keyword search
5. Cart / wishlist / checkout
6. pgvector / embeddings / worker / semantic search
7. Hybrid deterministic ranking
8. Structured AI search
9. Read-only assistant / compare
10. Security / rate limits / observability
11. Tests / AI evaluation
12. UX polish
13. Deployment
14. Documentation / demo
15. MVP Definition of Done gate
16. v2 only after the gate passes
```

Do not skip ahead when a later phase depends on an unfinished earlier phase.

When a user asks for a task from a later phase, first inspect the repository and determine whether its prerequisites exist. If they do not, report the missing prerequisites and implement only what can be done safely in dependency order.

---

## 13. Coding Standards

All code must be production-grade and fully typed.

Rules:

- Prefer the smallest design that satisfies current MVP requirements.
- Follow SOLID, DRY, KISS, and YAGNI.
- Avoid speculative abstractions.
- Avoid placeholder implementations and `TODO` comments unless the user explicitly requests scaffolding.
- Handle expected edge cases and error paths.
- Keep functions/modules focused.
- Prefer explicit names over abbreviations.
- Avoid `any`; if unavoidable at an external boundary, narrow immediately.
- Do not suppress TypeScript or lint errors without a documented reason.
- Do not add dependencies when an existing dependency solves the problem.
- Preserve public API compatibility unless the requested task requires a contract change.
- Keep comments focused on non-obvious invariants, not obvious syntax.

When creating backend API inputs, include `class-validator` DTO validation.

When creating frontend forms, include Zod validation.

---

## 14. File Placement Rules

Place code according to the documented monorepo layout.

Examples:

```text
Frontend route:
apps/web/src/app/...

Frontend feature:
apps/web/src/features/...

Frontend shared component:
apps/web/src/components/...

Frontend utility:
apps/web/src/lib/...

Backend module:
apps/api/src/modules/<module>/...

Backend cross-cutting concern:
apps/api/src/common/...

Shared public contract:
packages/contracts/...

Prisma schema:
prisma/schema.prisma

SQL migrations:
prisma/migrations/...

Scripts:
scripts/...
```

Do not create duplicate “utils”, “shared”, or “common” trees without checking the existing repository first.

Follow existing local naming conventions once code exists.

---

## 15. Before Editing

For every coding task:

1. Inspect repository status.
2. Read relevant documentation.
3. Inspect existing neighboring code.
4. Identify the phase and task in `docs/07-project-phases-and-task-list.md`.
5. Identify which Definition of Done criteria the task contributes to.
6. Identify affected API/database/contracts before editing.
7. Reuse existing patterns instead of creating parallel architecture.
8. Make the smallest coherent change that fully solves the requested task.

Do not assume a file, script, package, migration, or convention exists. Inspect first.

---

## 16. Validation After Changes

After modifying code, validate the affected scope.

First inspect root and package `package.json` scripts. Do not invent command names that do not exist.

When available, run in this order:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Then run task-specific validation where applicable:

```text
Database/migration change:
- migration validation
- affected integration tests

Backend API change:
- affected unit/integration tests
- API E2E where relevant

Worker/Redis change:
- BullMQ/Redis integration tests

Frontend change:
- affected tests
- build/typecheck
- Playwright flow when behavior changed

AI/search change:
- schema tests
- ranking tests
- grounding tests
- AI eval subset where available

Cross-cutting/release change:
- full lint
- full typecheck
- critical integration tests
- build web + api
```

Do not claim tests passed unless they were actually run successfully.

If a validation command cannot run because infrastructure, credentials, or a required service is unavailable, state exactly what was not run and why.

Do not hide failing tests.

---

## 17. Testing Expectations

Add or update tests whenever behavior changes.

Expected coverage categories:

### Unit

- ranking;
- filters;
- cart totals;
- intent parsing;
- embedding text;
- content-hash decisions;
- normalization;
- AI tool validation.

### Integration

Use real PostgreSQL/pgvector and Redis where relevant:

- repositories;
- vector queries;
- cache fallback;
- BullMQ jobs;
- refresh rotation;
- checkout transaction;
- embedding persistence.

### Contract

- DummyJSON payload validation;
- Gemini provider boundary;
- structured AI output validation.

### E2E

Critical MVP paths include:

```text
register -> login -> refresh -> logout
catalog -> search
cart -> checkout -> orders
semantic search
AI search
compare
assistant read-only tool flow
```

### AI evaluation

Maintain candidate grounding.

Release invariant:

```text
product IDs hallucinated outside backend candidate set = 0
```

---

## 18. Documentation Policy

Do not modify the seven normative files in `docs/` merely to make implementation easier.

Only edit them when:

- the user explicitly requests a specification/documentation change;
- a confirmed implementation decision must be documented;
- the task explicitly includes progress tracking.

If implementation requires violating a documented rule, stop and surface the issue instead of silently editing the rule.

For progress tracking in `docs/07-project-phases-and-task-list.md`, only mark an item complete when:

- the implementation exists;
- relevant validation has passed;
- no known blocking issue remains.

---

## 19. Git and Change Discipline

Before editing:

```bash
git status --short
```

Rules:

- Do not discard unrelated user changes.
- Do not rewrite existing commits unless explicitly asked.
- Keep changes focused on the requested task.
- Do not perform broad formatting churn unrelated to the task.
- Review the final diff before reporting completion.
- Do not commit automatically unless the user explicitly asks for a commit.

When the task modifies a public API, schema, or shared contract, mention that impact in the final report.

---

## 20. Final Response Contract

At the end of a coding task, report concisely:

1. **Phase / task**
   - Which phase from `docs/07-project-phases-and-task-list.md` was implemented.

2. **Files changed**
   - Exact repository-relative paths.

3. **What changed**
   - Behavior and architectural effect.

4. **Validation**
   - Exact commands/tests run and whether they passed.

5. **Definition of Done**
   - Which ShopMind DoD criteria were advanced or completed.

6. **Remaining issues**
   - Only real blockers, failures, assumptions, or follow-up tasks.

Never claim the entire phase or DoD area is complete when only part of it was implemented.

---

## 21. Decision Rules for Underspecified Areas

The documentation intentionally leaves some implementation details open.

Examples include:

- refresh-session table shape;
- exact `source_status` representation;
- exact post-login redirect;
- exact ingestion job response body/status endpoint;
- exact `AiConversation` / `AiMessage` columns;
- whether HNSW is enabled for the small MVP dataset.

When encountering an underspecified area:

1. Do not pretend the docs define it.
2. Choose the smallest implementation consistent with all documented invariants.
3. Prefer existing repository conventions if they already establish a pattern.
4. Do not introduce v2 scope.
5. State the implementation decision in the final report when it materially affects architecture or contracts.

---

## 22. Stop Conditions

Stop and report before coding if the requested task would:

- turn the backend into microservices;
- make DummyJSON the runtime source of truth;
- expose secrets to the browser;
- allow AI to perform write actions;
- bypass transaction locking for checkout;
- trust model-generated price/stock/product facts;
- use unparameterized raw vector SQL;
- change embedding dimension away from `768` without a coordinated DB/spec migration;
- add a v2 feature before the MVP gate without explicit scope approval;
- contradict one of the normative documents with no explicit user-approved specification change.

The project documents are the contract. Do not silently redesign ShopMind.
