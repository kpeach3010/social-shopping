ALTER TABLE "product_variants" ADD COLUMN "image_path" varchar;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "image_url" varchar;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "thumbnail_path" varchar;