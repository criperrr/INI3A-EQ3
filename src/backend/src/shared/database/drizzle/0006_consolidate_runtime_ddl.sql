-- Consolidate runtime ad-hoc DDL from migrate.ts and seed.ts into formal Drizzle migration
ALTER TABLE "badge" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customization_item" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "category" varchar(30) NOT NULL,
  "description" text,
  "price" integer DEFAULT 0 NOT NULL,
  "min_level" integer DEFAULT 1 NOT NULL,
  "preview_value" text NOT NULL,
  "config" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customization_item_name_key" UNIQUE("name"),
  CONSTRAINT "customization_item_price_check" CHECK (price >= 0),
  CONSTRAINT "customization_item_min_level_check" CHECK (min_level >= 1)
);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "equipped_banner_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "equipped_avatar_frame_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "equipped_level_frame_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "equipped_title_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "two_factor_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "points" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "danger_flag" SET DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'user_equipped_banner_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_equipped_banner_id_fkey" FOREIGN KEY ("equipped_banner_id") REFERENCES "public"."customization_item"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'user_equipped_avatar_frame_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_equipped_avatar_frame_id_fkey" FOREIGN KEY ("equipped_avatar_frame_id") REFERENCES "public"."customization_item"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'user_equipped_level_frame_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_equipped_level_frame_id_fkey" FOREIGN KEY ("equipped_level_frame_id") REFERENCES "public"."customization_item"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'user_equipped_title_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_equipped_title_id_fkey" FOREIGN KEY ("equipped_title_id") REFERENCES "public"."customization_item"("id") ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_customization" (
  "user_id" integer NOT NULL,
  "item_id" integer NOT NULL,
  "purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_customization_pkey" PRIMARY KEY("user_id","item_id")
);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'user_customization_user_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "user_customization" ADD CONSTRAINT "user_customization_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'user_customization_item_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "user_customization" ADD CONSTRAINT "user_customization_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."customization_item"("id") ON DELETE CASCADE;
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_report" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  "reason" varchar(100) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'product_report_user_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "product_report" ADD CONSTRAINT "product_report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'product_report_product_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "product_report" ADD CONSTRAINT "product_report_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE CASCADE;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "created_by_user_id" integer;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'product_created_by_user_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "product" ADD CONSTRAINT "product_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_created_by" ON "product" ("created_by_user_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_submission" (
  "product_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_submission_pkey" PRIMARY KEY("product_id","user_id")
);--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'product_submission'
      AND column_name = 'submitted_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'product_submission'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "product_submission" RENAME COLUMN "submitted_at" TO "created_at";
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "product_submission" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'product_submission_product_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "product_submission" ADD CONSTRAINT "product_submission_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'product_submission_user_id_fkey'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "product_submission" ADD CONSTRAINT "product_submission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "ocurrency" ADD COLUMN IF NOT EXISTS "is_promotion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "ocurrency" SET "is_promotion" = false WHERE "is_promotion" IS NULL;--> statement-breakpoint
ALTER TABLE "ocurrency" ALTER COLUMN "is_promotion" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "ocurrency" ALTER COLUMN "is_promotion" SET NOT NULL;--> statement-breakpoint
UPDATE "product" p
SET "is_suspended" = TRUE
WHERE (p."icon" IS NULL OR TRIM(p."icon") = '')
  AND NOT EXISTS (
    SELECT 1 FROM "ocurrency" o WHERE o."product_id" = p."id" AND o."is_suspended" = FALSE
  );--> statement-breakpoint
INSERT INTO "product_submission" ("product_id", "user_id")
SELECT p."id", p."created_by_user_id"
FROM "product" p
WHERE p."is_suspended" = TRUE AND p."created_by_user_id" IS NOT NULL
ON CONFLICT ("product_id", "user_id") DO NOTHING;
