# Stripe test mode

ShopMind creates PaymentIntents only after a user explicitly chooses Stripe test checkout. The backend locks cart rows, reloads canonical price/stock, snapshots the order, and owns amount/currency. The browser sends only a UUID idempotency key. `sk_test_*` is required when enabled; live secret keys are rejected. Stripe.js receives only the provider-defined `pk_test_*` publishable key and client secret; ShopMind never handles PAN/CVC.

Webhook processing uses the unmodified raw request body, a five-minute timestamp tolerance, HMAC-SHA256 signature verification, an event allowlist, unique event IDs, and explicit payment/order transitions. AI tools remain unchanged and contain no checkout/payment/refund capability.
