CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');
CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "order_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "provider" VARCHAR(30) NOT NULL DEFAULT 'stripe', "provider_payment_id" VARCHAR(255), "idempotency_key" UUID NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT', "amount" DECIMAL(12,2) NOT NULL, "currency" VARCHAR(3) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"), CONSTRAINT "payments_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "payments_provider_payment_id_key" UNIQUE ("provider_payment_id"), CONSTRAINT "payments_user_id_idempotency_key_key" UNIQUE ("user_id", "idempotency_key"),
  CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "idx_payments_user_created" ON "payments"("user_id", "created_at" DESC);
CREATE INDEX "idx_payments_status_updated" ON "payments"("status", "updated_at" DESC);
CREATE TABLE "payment_webhook_events" (
  "id" VARCHAR(255) NOT NULL, "type" VARCHAR(100) NOT NULL, "provider_created" TIMESTAMPTZ(6) NOT NULL,
  "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);
