CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_ai_conversations_user_updated"
ON "ai_conversations"("user_id", "updated_at" DESC);

CREATE INDEX "idx_ai_messages_conversation_created"
ON "ai_messages"("conversation_id", "created_at", "id");

ALTER TABLE "ai_conversations"
ADD CONSTRAINT "ai_conversations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_messages"
ADD CONSTRAINT "ai_messages_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
