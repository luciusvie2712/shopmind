# Worker recovery runbook

Use this procedure for retained BullMQ failures in the `ingestion` and
`embedding` queues.

1. Find the queue, job name, job ID, attempt, status, and error type in the
   structured worker log.
2. Inspect that exact retained BullMQ job and its attempts. Do not log or copy
   secrets, full provider payloads, or embedding vectors.
3. Classify the root cause: Redis/queue infrastructure, PostgreSQL, DummyJSON,
   Gemini embedding/provider, external validation, vector validation, or a
   stale/no-op job.
4. Restore the failed dependency or fix the underlying configuration/code.
5. Confirm the job is safe to retry. `SYNC_PRODUCTS` is idempotent by
   `(source, external_id)`. For `EMBED_PRODUCT`, compare the job `productId`
   and `contentHash` with the current canonical `Product.content_hash`; stale
   content must not overwrite a newer embedding.
6. Retry only the identified failed job through BullMQ's job retry operation or
   the existing application enqueue path. Never inject an embedding vector
   manually.
7. Verify the job reaches `completed`, then verify canonical PostgreSQL state.
   For ingestion, confirm upsert identity and content hashes. For embedding,
   confirm model, dimension `768`, and the current content hash.
8. Confirm repeating the safe operation did not create duplicate products or
   duplicate logical embedding work.

Do not use destructive recovery shortcuts such as deleting the catalog,
dropping the database, `redis-cli FLUSHALL`, `docker compose down -v`, blindly
deleting all jobs, or manually editing embedding rows. Retained failed jobs and
their structured logs are diagnostic evidence.
