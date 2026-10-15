ALTER TABLE "cart_product" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;
