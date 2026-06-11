CREATE TYPE "public"."recovery_message_status" AS ENUM('Satisfatório', 'Insatisfatório', 'Não Compareceu', 'Não aconteceu');--> statement-breakpoint
CREATE TYPE "public"."status_rec" AS ENUM('SAT', 'INS', 'NC', 'NAC');--> statement-breakpoint
CREATE TABLE "badge" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" text,
	"min_points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "badge_name_key" UNIQUE("name"),
	CONSTRAINT "badge_min_points_check" CHECK (min_points >= 0)
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_product" (
	"cart_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_product_pkey" PRIMARY KEY("product_id","cart_id")
);
--> statement-breakpoint
CREATE TABLE "cured" (
	"user_id" integer NOT NULL,
	"ocurrency_id" integer NOT NULL,
	"verdict" boolean NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cured_pkey" PRIMARY KEY("user_id","ocurrency_id")
);
--> statement-breakpoint
CREATE TABLE "market" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"location" "geography" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocurrency" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"market_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trust_flag" boolean DEFAULT true NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"downvote_count" integer DEFAULT 0 NOT NULL,
	"volate" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ocurrency_value_check" CHECK (value > (0)::numeric),
	CONSTRAINT "ocurrency_upvote_count_check" CHECK (upvote_count >= 0),
	CONSTRAINT "ocurrency_downvote_count_check" CHECK (downvote_count >= 0)
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" serial PRIMARY KEY NOT NULL,
	"ean" text,
	"ncm" varchar(10),
	"name" varchar(200) NOT NULL,
	"description" text,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"min_points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "role_name_key" UNIQUE("name"),
	CONSTRAINT "role_min_points_check" CHECK (min_points >= 0)
);
--> statement-breakpoint
CREATE TABLE "role_scope" (
	"role_id" integer NOT NULL,
	"scope_id" integer NOT NULL,
	CONSTRAINT "role_scope_pkey" PRIMARY KEY("scope_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "scope" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_name" varchar(100) NOT NULL,
	CONSTRAINT "scope_scope_name_key" UNIQUE("scope_name")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"pass_hash" varchar(255) NOT NULL,
	"birthdate" date,
	"points" integer DEFAULT 0 NOT NULL,
	"danger_flag" boolean DEFAULT false NOT NULL,
	"location" "geography",
	"role_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_key" UNIQUE("email"),
	CONSTRAINT "user_points_check" CHECK (points >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_badge" (
	"user_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badge_pkey" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_product" ADD CONSTRAINT "cart_product_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_product" ADD CONSTRAINT "cart_product_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cured" ADD CONSTRAINT "cured_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cured" ADD CONSTRAINT "cured_ocurrency_id_fkey" FOREIGN KEY ("ocurrency_id") REFERENCES "public"."ocurrency"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocurrency" ADD CONSTRAINT "ocurrency_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocurrency" ADD CONSTRAINT "ocurrency_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."market"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocurrency" ADD CONSTRAINT "ocurrency_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_scope" ADD CONSTRAINT "role_scope_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_scope" ADD CONSTRAINT "role_scope_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cured_ocurrency_id_date_asc" ON "cured" USING btree ("ocurrency_id","date");--> statement-breakpoint
CREATE INDEX "idx_market_location" ON "market" USING gist ("location" gist_geography_ops);--> statement-breakpoint
CREATE INDEX "idx_ocurrency_market_id_created_at_desc" ON "ocurrency" USING btree ("market_id","created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_ocurrency_product_id_created_at_desc" ON "ocurrency" USING btree ("product_id","created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_ocurrency_unresolved_partial" ON "ocurrency" USING btree ("is_resolved","created_at" timestamptz_ops) WHERE is_resolved = false;--> statement-breakpoint
CREATE INDEX "idx_product_ean_partial" ON "product" USING btree ("ean" text_ops) WHERE (ean IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_product_name_trgm" ON "product" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_product_ncm" ON "product" USING btree ("ncm" text_ops);--> statement-breakpoint
CREATE INDEX "idx_user_location" ON "user" USING gist ("location" gist_geography_ops);--> statement-breakpoint
CREATE INDEX "idx_user_role_id" ON "user" USING btree ("role_id" int4_ops);