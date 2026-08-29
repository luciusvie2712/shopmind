# ADR 007: Stripe test payment, order state, and webhook idempotency

Status: Accepted

Decision type: DERIVED.

Stripe PaymentIntents in test mode extend, rather than remove, the existing simulated checkout. A user explicitly creates a payable order through the backend-authoritative locked-cart transaction; the server computes amount/currency and creates one payment record. Stripe calls use an order-derived idempotency key. Signed allowlisted webhooks are the authority for payment status; webhook IDs are uniquely persisted and transitions are explicit and idempotent. No card data is stored. AI has no payment or checkout tool.

Consequences: real/live keys are rejected by configuration. A pending payment order is not represented as paid until a verified webhook transition succeeds.
