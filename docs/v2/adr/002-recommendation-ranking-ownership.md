# ADR 002: Recommendation and ranking ownership

Status: Accepted

Decision type: DERIVED.

Candidate generation and scoring remain backend-owned and deterministic. Canonical active/in-stock products are filtered before scoring. Explicit preferences, wishlist/cart/order history, and bounded recent-event aggregates contribute capped affinity signals. Cold-start returns the existing quality/popularity baseline. Versioned weights live in code/config and an LLM cannot change them or rank the full catalog.

Consequences: identical canonical inputs and weight version produce stable results; other users' private history is never read into a user's profile.
