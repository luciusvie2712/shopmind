# ShopMind v2

ShopMind v2 implements Phase 16 after the verified MVP baseline. The MVP remains the compatibility and rollback baseline.

## Legend

- **SOURCE-LOCKED**: required by the technical specification or normative MVP documents.
- **DERIVED**: the smallest repository-specific decision that preserves source invariants.

## Invariants

- PostgreSQL remains canonical for catalog and commerce state.
- NestJS remains a modular monolith; providers and external sources stay behind adapters.
- AI and assistant tools are read-only for commerce state.
- User-visible product facts are remapped from canonical backend records.
- Authorization, validation, hard constraints, vector SQL safety, and idempotency remain server-owned.

## Execution order

Work proceeds in task-list order: foundation, events, admin analytics, recommendations, review summaries, provider fallback, SSE, multimodal search, commerce-source adapters, Stripe test mode, and final QA.

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for verified progress and [EXTERNAL_ACTIONS_REQUIRED.md](./EXTERNAL_ACTIONS_REQUIRED.md) for platform work that cannot be completed from this repository.
