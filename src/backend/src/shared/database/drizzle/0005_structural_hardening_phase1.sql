ALTER TABLE "ocurrency" DROP CONSTRAINT IF EXISTS "ocurrency_value_check";--> statement-breakpoint
ALTER TABLE "ocurrency" ADD CONSTRAINT "ocurrency_value_check" CHECK (value >= 0.10 AND value <= 15000.00);--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "created_by_user_id" integer;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_created_by_user_id_fkey') THEN
    ALTER TABLE "product" ADD CONSTRAINT "product_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_created_by" ON "product" ("created_by_user_id");
