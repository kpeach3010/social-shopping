ALTER TYPE "public"."group_order_status" ADD VALUE 'awaiting_payment' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'order_cancelled';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'order_paid';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'order_confirmed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'order_rejected';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'order_completed';--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "cart_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "colors" ALTER COLUMN "product_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "color_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "size_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "product_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "product_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sizes" ALTER COLUMN "product_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "back_thumbnail_path" varchar;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "back_thumbnail_url" varchar;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_group_order_id_unique" UNIQUE("group_order_id");