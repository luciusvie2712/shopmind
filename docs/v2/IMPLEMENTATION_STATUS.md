# ShopMind v2 implementation status

Last updated: 2026-08-29

| Phase | Task | Status | Files / migrations | Tests | Decisions / blockers |
|---|---|---|---|---|---|
| 16.0 | MVP baseline | PASS | baseline commit captured; annotated tag `mvp-v1.0` | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm build` | Local baseline: 135 unit and 48 integration tests pass. Production smoke remains an external environment check. |
| 16.0 | v2 docs and ADRs | PASS | `docs/v2/**` | documentation review | Eight high-risk ADRs recorded before feature implementation. |
| 16.1 | Events / feedback | PASS | `UserEvent` migration; `apps/api/src/modules/events/**`; ranking feedback; web telemetry | event DTO/service/ranking unit tests; PostgreSQL migration and integration suite | Append-only, idempotent, metadata-allowlisted writes; behavior contribution is capped at 5%. |
| 16.2 | Admin analytics | PASS | `apps/api/src/modules/admin/**`; `/admin`; queue snapshot | lint, typecheck, build, integration and browser regression suites | Backend ADMIN guard is authoritative; queue outages produce explicit partial data. |
| 16.3 | Recommendations | PASS | `apps/api/src/modules/recommendations/**`; home recommendation section | deterministic ranking unit tests plus full regression gates | Per-user history is isolated; cold start uses global popularity; only active/in-stock canonical products are returned. |
| 16.4 | Review summaries | PASS | review-summary migration; queue/processor/API/UI | content-hash unit test plus full regression gates | Canonical raw reviews remain visible; generation is lazy, async, bounded and versioned by review-set hash. |
| 16.5 | Provider fallback | BLOCKED_EXTERNAL | fallback router, capability matrix, policy tests | primary/transient-fallback/invalid-output tests pass | A concrete secondary provider cannot be selected or configured without an owner/provider decision and credentials. |
| 16.6 | SSE assistant | PASS | SSE endpoint/service/client UI with stop and non-stream fallback | stream unit tests and assistant browser tests | Canonical final turn is persisted once by the existing assistant service; hidden reasoning is never emitted. Production proxy smoke is external. |
| 16.7 | Multimodal | IN_PROGRESS | transient image-upload endpoint/UI; Gemini multimodal query embedding; parameterized vector search | file-validation unit tests; typecheck/build | Product-image async embedding/indexing and relevance evaluation remain incomplete; live model/quota smoke needs credentials. |
| 16.8 | Commerce source | BLOCKED_EXTERNAL | source-provider contract and DummyJSON adapter | adapter contract unit test and ingestion regression suites | Repository boundary is complete; no real provider can be implemented without provider selection, API contract and credentials. |
| 16.9 | Stripe test mode | BLOCKED_EXTERNAL | payment/webhook migration; server-authoritative intent/webhook flow; Payment Element UI | signature unit tests; migration/typecheck/build/regression gates | Stripe test keys and public webhook registration are required for an end-to-end payment transition test. |
| 16.10 | Final QA / release | BLOCKED_EXTERNAL | Windows E2E runner fixes and v2 documentation | local lint/typecheck/unit/integration/build gates pass; full browser suite 39/39 passes | Production smoke and the blocked provider/payment gates prevent a v2 release PASS decision. |

## Baseline evidence

- Baseline commit: `fe156375bba0bf38ee355387743b4a412e3724e8` (`feat(web): add unified toast and inline feedback system`).
- Final pre-v2 migration: `20260823220000_phase9_ai_conversations`.
- Working tree was clean before Phase 16 changes.
- Public API contracts are manually maintained in `packages/contracts` and Swagger is generated from NestJS decorators.

## Latest local gate evidence

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 46 suites / 161 tests.
- `pnpm test:integration` with PostgreSQL `localhost:5433` and isolated Redis DB 15: PASS, 9 suites / 48 tests.
- `pnpm build`: PASS for contracts, API and web.
- Browser E2E: PASS, 39/39 Playwright tests after fixing Windows process launch, Nest build entry-point resolution, SSE fixtures and stale-port readiness detection.

## Release decision

**ShopMind v2 is not release-complete.** Local repository gates for implemented scope are green, but Phase 16.7 still has internal indexing/evaluation work and Phases 16.5, 16.8, 16.9 and production portions of 16.10 require the external actions recorded in `EXTERNAL_ACTIONS_REQUIRED.md`.

## Status meanings

- `PASS`: implemented and applicable local verification passed.
- `IN_PROGRESS`: implementation or validation is incomplete.
- `BLOCKED_EXTERNAL`: repository work is complete but credentials, provider selection, deployment, or external platform action is required.
- `NOT_STARTED`: dependency order has not reached the task.
