CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "idx_products_title_trgm"
ON "products" USING GIN ("title" gin_trgm_ops);
