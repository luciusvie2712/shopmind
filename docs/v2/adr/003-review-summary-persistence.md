# ADR 003: Review summary persistence and versioning

Status: Accepted

Decision type: DERIVED.

Review summaries are persisted one-per-product in PostgreSQL with a deterministic SHA-256 review-set hash, provider/model metadata, structured JSON fields, review count, timestamps, and status. Generation is an idempotent BullMQ job keyed by product ID plus review hash. Only canonical `ProductReview` rows are input. A stale, failed, or absent summary never blocks product detail or hides raw reviews.

Consequences: provider failures degrade cleanly and a review change deterministically invalidates the previous summary.
