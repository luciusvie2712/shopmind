# External actions required

## Phase 16.9A production smoke

Reason: Source implementation and local verification can run in this workspace, but the public Vercel/API/worker/PostgreSQL/Redis deployment is external.

Exact user action: Apply migration `20260829130000_phase16_9a_demo_payment_fulfillment`, deploy API/worker/web, configure all six `DEMO_*` values on API and worker, then run both SUCCESS and FAILURE 90-second flows with a refresh during delivery.

Required environment variables: `DEMO_PAYMENT_ENABLED=true`, `DEMO_FULFILLMENT_ENABLED=true`, `DEMO_FULFILLMENT_RECEIVED_TO_TRANSIT_MS=20000`, `DEMO_FULFILLMENT_TRANSIT_TO_OUT_FOR_DELIVERY_MS=35000`, `DEMO_FULFILLMENT_OUT_FOR_DELIVERY_TO_FINAL_MS=35000`, `DEMO_FULFILLMENT_DEFAULT_SCENARIO=SUCCESS`.

Security notes: These are backend runtime settings, not `NEXT_PUBLIC_*` values. No real bank/card/courier credentials are involved.

Status: BLOCKED_EXTERNAL_DEPLOYMENT

## Production baseline and v2 smoke

Reason: Deployed Vercel/API/worker/database/Redis configuration and public smoke tests are outside the local repository.

Exact user action: Run the production smoke checklist after deployment and record platform references without secrets.

Required environment variables: Existing production variables plus the v2 variables listed as phases are implemented.

Where configured: Platform secret managers for web, API, and worker services.

How to verify: Follow `docs/SHOPMIND_V2_DETAILED_TASK_LIST.md` section 10.

Security notes: Never copy secret values into documentation or Git.

Status: OPEN

## Secondary AI provider

Reason: Fallback policy and routing are implemented, but ShopMind has no owner-approved secondary provider, model, quotas, data-processing terms, or credentials.

Exact user action: Select the secondary provider/model, approve its data-handling policy, and provide test credentials through the platform secret manager.

Required environment variables: Provider-specific key/model variables and an enabled `AI_FALLBACK_PROVIDER` value added with the selected adapter.

Where configured: API and worker secret managers; never the browser.

How to verify: Run provider contract tests, forced-timeout fallback integration, latency-budget tests, and production smoke while confirming no fallback occurs on validation or authorization errors.

Security notes: Do not log prompts, credentials, access tokens, or full provider payloads.

Status: BLOCKED_EXTERNAL_PROVIDER_SELECTION

## Real commerce source

Reason: The provider-neutral ingestion boundary is implemented, but no commerce provider/API contract or credentials were selected.

Exact user action: Select a provider, supply its official schema/rate-limit documentation and sandbox credentials, and decide deletion/tombstone semantics.

Required environment variables: Provider-specific base URL/key/account values and the corresponding allowlisted `PRODUCT_SOURCE_PROVIDER` value.

Where configured: API/worker secret managers.

How to verify: Run schema contract tests, two idempotent full syncs, changed/deleted product reconciliation, bounded retry tests, and an admin-visible sync-status smoke.

Security notes: Treat all remote fields as untrusted; do not expose source credentials or make the remote service the runtime catalog source of truth.

Status: BLOCKED_EXTERNAL_PROVIDER_SELECTION

## Stripe test mode

Reason: Repository code only accepts test-mode Stripe configuration; no keys or public webhook endpoint are available in this workspace.

Exact user action: Create/select a Stripe test account, configure a public HTTPS webhook for `/api/v1/payments/webhooks/stripe`, and place test keys in secret managers.

Required environment variables: `STRIPE_TEST_MODE_ENABLED=true`, `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`, and optional `STRIPE_CURRENCY`.

Where configured: Secret key/webhook secret on API only; publishable test key on web.

How to verify: Exercise success, decline, retry, duplicate webhook and out-of-order event cases; confirm one order/payment per idempotency key and verified webhook-only status transitions.

Security notes: Never enable live keys, log client secrets/signatures, or collect raw card data in ShopMind components.

Status: BLOCKED_EXTERNAL_CREDENTIALS_AND_WEBHOOK

## Multimodal live capability and evaluation

Reason: Upload validation and query embedding are implemented, but live Gemini multimodal quota/capability and a curated visual relevance set are unavailable locally.

Exact user action: Provide a Gemini project/key with the selected multimodal embedding model enabled and approve a non-sensitive evaluation image set.

Required environment variables: Existing `GEMINI_API_KEY`, the approved embedding model, and `MULTIMODAL_MAX_UPLOAD_BYTES` if overriding the default.

Where configured: API/worker secret manager only.

How to verify: Run live image embedding dimension/finite-value smoke, canonical-ID Recall@K evaluation, malformed/oversize cases, and confirm text search remains healthy during provider failure.

Security notes: Uploaded query images are transient and must not be logged or durably stored.

Status: BLOCKED_EXTERNAL_CREDENTIALS_AND_EVALUATION_DATA
