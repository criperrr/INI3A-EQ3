ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "two_factor_verified" boolean DEFAULT false NOT NULL;
