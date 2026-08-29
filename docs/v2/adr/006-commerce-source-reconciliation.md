# ADR 006: Commerce-source adapters and reconciliation

Status: Accepted

Decision type: DERIVED.

Ingestion consumes a `ProductSourceProvider` that returns validated normalized products plus source/cursor metadata. DummyJSON remains the local/demo adapter. Each source owns `(source, external_id)` identity; products are never merged by title. Sync runs persist status/cursor/counts, are resumable and idempotent, mark missing source records without hard deletion, and enqueue embeddings only on content-hash changes.

Consequences: provider outages do not affect PostgreSQL catalog reads. A concrete real vendor requires an explicit provider selection and credentials.
