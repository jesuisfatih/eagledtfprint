-- CreateTable
CREATE TABLE "sync_states" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMP(3),
    "lock_expires_at" TIMESTAMP(3),
    "last_cursor" TEXT,
    "last_synced_id" BIGINT,
    "last_started_at" TIMESTAMP(3),
    "last_completed_at" TIMESTAMP(3),
    "last_failed_at" TIMESTAMP(3),
    "total_records_synced" INTEGER NOT NULL DEFAULT 0,
    "last_run_records" INTEGER NOT NULL DEFAULT 0,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_states_merchant_id_idx" ON "sync_states"("merchant_id");
CREATE INDEX "sync_states_entity_type_idx" ON "sync_states"("entity_type");
CREATE INDEX "sync_states_status_idx" ON "sync_states"("status");
CREATE UNIQUE INDEX "sync_states_merchant_id_entity_type_key" ON "sync_states"("merchant_id", "entity_type");

-- AddForeignKey
ALTER TABLE "sync_states" ADD CONSTRAINT "sync_states_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
