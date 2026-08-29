# ADR 001: Event schema, privacy, and retention

Status: Accepted

Decision type: DERIVED, preserving SOURCE-LOCKED privacy and canonical-data rules.

Behavior events are append-only PostgreSQL rows with a UUID, strict enum, optional server-resolved user, optional canonical product, bounded metadata, optional idempotency key, request ID, and UTC timestamp. Initial ingestion is synchronous because three small events do not justify a second delivery system; browser dispatch remains best-effort and never blocks commerce. Unknown metadata keys and sensitive values are rejected. Events are retained for 180 days, with a documented maintenance delete in bounded batches. Aggregates never expose raw PII to non-admin users.

Consequences: DB constraints provide idempotency and referential integrity. Event endpoint rate limiting and metadata limits control abuse. Operational logs remain separate.
