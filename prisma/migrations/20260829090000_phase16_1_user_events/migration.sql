CREATE TYPE "UserEventType" AS ENUM (
  'PRODUCT_VIEW',
  'SEARCH_RESULT_CLICK',
  'ADD_TO_CART',
  'RECOMMENDATION_IMPRESSION',
  'RECOMMENDATION_CLICK'
);

CREATE TABLE "user_events" (
  "id" UUID NOT NULL,
  "type" "UserEventType" NOT NULL,
  "user_id" UUID,
  "product_id" UUID,
  "correlation_id" VARCHAR(128),
  "request_id" VARCHAR(128),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "user_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_user_events_user_created"
ON "user_events"("user_id", "created_at" DESC);

CREATE INDEX "idx_user_events_type_created"
ON "user_events"("type", "created_at" DESC);

CREATE INDEX "idx_user_events_product_type_created"
ON "user_events"("product_id", "type", "created_at" DESC);
