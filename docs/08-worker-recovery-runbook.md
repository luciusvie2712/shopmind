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

## Catalog P2028 repair (Phase 3 / Phase 13.4)

Reported production baseline: `PrismaClientKnownRequestError`, code `P2028`,
`Transaction not found`, at `category.upsert()`. The pre-repair importer holds
one interactive transaction across the entire catalog and repeats category
upserts inside that loop. That transaction lifecycle is the code defect being
repaired; the report alone does not prove a particular pooler/network failure.
No schema migration or pooler change is required by this repair.

Implementation decision: deduplicate/upsert categories before product writes;
commit each product with its images/reviews in its own transaction (`maxWait`
5 seconds, `timeout` 10 seconds). These are per-product guardrails. A failed
product rolls back; earlier products remain committed. Do not mark absent
products until the full validated payload has persisted. Queue publication
happens afterward. Retry recovers absent/stale embeddings from canonical hashes.

After API and worker run the CI-approved patch, execute in the API runtime:

```bash
node apps/api/dist/catalog-bootstrap.js
```

This CLI forces a full idempotent sync. Do not delete products before retrying
and do not pass `--if-empty` for recovery. That option exists only to preserve
the optional empty-only development startup behavior. CLI logs distinguish
`started`, `imported`, `skipped`, and `failed`; failures exit non-zero.

Record a read-only production baseline before deploying and after importing:

```sql
SELECT
  (SELECT count(*) FROM categories) AS categories,
  (SELECT count(*) FROM products) AS products,
  (SELECT count(*) FROM product_images) AS images,
  (SELECT count(*) FROM product_reviews) AS reviews,
  (SELECT count(*) FROM product_embeddings) AS embeddings;

SELECT source, source_status, count(*) FROM products GROUP BY source, source_status;
SELECT source, external_id, count(*) FROM products GROUP BY source, external_id HAVING count(*) > 1;
SELECT slug, count(*) FROM categories GROUP BY slug HAVING count(*) > 1;
SELECT count(*) AS invalid_content_hash FROM products WHERE content_hash !~ '^[a-f0-9]{64}$';

SELECT count(*) AS active_products,
  count(e.product_id) AS current_embeddings
FROM products p LEFT JOIN product_embeddings e
  ON e.product_id = p.id AND e.content_hash = p.content_hash
WHERE p.source_status = 'ACTIVE';

SELECT model, vector_dims(embedding) AS dimensions, count(*)
FROM product_embeddings GROUP BY model, vector_dims(embedding);
```

No production count has been captured by this repair's local checks. Local
fixtures and mocked-provider vectors are not production deployment evidence.
After the worker finishes, repeat the full import and confirm `created=0`,
`updated=0`, all current products `unchanged`, and `embeddingJobs=0` in the import
log (unless the external source actually changed). Inspect retained failed jobs
and retry those explicitly using the procedure above; adding an already retained
failed job ID does not reset BullMQ's exhausted attempt budget.

Do not mark Phase 13 or the production reliability milestone complete until
runtime SHAs, DB counts/hashes, worker completion, API/web catalog, semantic
retrieval, ADMIN RBAC, and the full production smoke flow have been verified.
An Admin Dashboard is outside this repair's scope.

### Worker version safety

The worker also skips provider work when PostgreSQL already has an embedding
for the current content hash, even after BullMQ's completed-job retention ends.
After a provider response, embedding persistence locks and rechecks the active
canonical product/version in one parameterized SQL statement. A late result
cannot overwrite a newer embedding or recreate an embedding for a now-missing
product. No database lock is held while calling Gemini.

### Codebase scope versus operator verification

Local regression suites cover importer atomicity/recovery, deterministic jobs,
duplicate delivery, late provider responses, PostgreSQL/pgvector retrieval,
Redis/BullMQ processing and retry, and ADMIN ingestion RBAC. Provider boundaries
are mocked in these tests; vectors and catalog fixtures are local test data.
Production baseline counts, Northflank/Vercel deployment, live provider
completion, production account provisioning, and public smoke tests remain
operator-owned checks. Local PASS does not mark Phase 13 or the full MVP gate
complete.
