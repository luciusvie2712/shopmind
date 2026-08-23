CREATE TABLE "ai_request_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "operation" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_request_logs_user_id_idx" ON "ai_request_logs"("user_id");

CREATE INDEX "idx_ai_request_logs_operation_created"
ON "ai_request_logs"("operation", "created_at" DESC);

ALTER TABLE "ai_request_logs"
ADD CONSTRAINT "ai_request_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
