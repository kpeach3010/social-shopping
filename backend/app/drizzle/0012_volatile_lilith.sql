CREATE TYPE "public"."status_enum" AS ENUM('active', 'disabled');--> statement-breakpoint
ALTER TABLE "colors" ADD COLUMN "image_path" varchar;--> statement-breakpoint
ALTER TABLE "colors" ADD COLUMN "image_url" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_enum" "status_enum" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "image_path";--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "image_url";