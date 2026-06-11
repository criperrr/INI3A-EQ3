-- Custom SQL migration file, put your code below! --
ALTER TABLE "market" ALTER COLUMN "location" SET DATA TYPE geography(POINT, 4326) USING "location"::geography(POINT, 4326);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "location" SET DATA TYPE geography(POINT, 4326) USING "location"::geography(POINT, 4326);