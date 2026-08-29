CREATE TYPE "ReviewSummaryStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TABLE "product_review_summaries" (
  "product_id" UUID NOT NULL,
  "review_set_hash" VARCHAR(64) NOT NULL,
  "status" "ReviewSummaryStatus" NOT NULL DEFAULT 'PENDING',
  "themes" JSONB NOT NULL DEFAULT '[]',
  "positives" JSONB NOT NULL DEFAULT '[]',
  "negatives" JSONB NOT NULL DEFAULT '[]',
  "caveats" JSONB NOT NULL DEFAULT '[]',
  "review_count" INTEGER NOT NULL,
  "provider" VARCHAR(50),
  "model" VARCHAR(100),
  "error_code" VARCHAR(50),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "product_review_summaries_pkey" PRIMARY KEY ("product_id"),
  CONSTRAINT "product_review_summaries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_review_summaries_status_updated" ON "product_review_summaries"("status", "updated_at" DESC);
