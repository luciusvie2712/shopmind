ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAID';

CREATE TYPE "FulfillmentStatus" AS ENUM ('ORDER_RECEIVED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED');
CREATE TYPE "FulfillmentScenario" AS ENUM ('SUCCESS', 'FAILURE');

ALTER TABLE "payments"
ADD COLUMN "reference" VARCHAR(100),
ADD COLUMN "paid_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

CREATE TABLE "fulfillments" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "status" "FulfillmentStatus" NOT NULL DEFAULT 'ORDER_RECEIVED',
  "scenario" "FulfillmentScenario" NOT NULL DEFAULT 'SUCCESS',
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "fulfillments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fulfillment_events" (
  "id" UUID NOT NULL,
  "fulfillment_id" UUID NOT NULL,
  "status" "FulfillmentStatus" NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fulfillment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fulfillments_order_id_key" ON "fulfillments"("order_id");
CREATE INDEX "idx_fulfillments_status_started" ON "fulfillments"("status", "started_at");
CREATE UNIQUE INDEX "fulfillment_events_fulfillment_id_status_key" ON "fulfillment_events"("fulfillment_id", "status");
CREATE INDEX "idx_fulfillment_events_timeline" ON "fulfillment_events"("fulfillment_id", "occurred_at");

ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_fulfillment_id_fkey" FOREIGN KEY ("fulfillment_id") REFERENCES "fulfillments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
