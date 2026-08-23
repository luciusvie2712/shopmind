CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "product_embeddings" (
    "product_id" UUID NOT NULL,
    "embedding" VECTOR(768) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_embeddings_pkey" PRIMARY KEY ("product_id")
);

ALTER TABLE "product_embeddings"
ADD CONSTRAINT "product_embeddings_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
