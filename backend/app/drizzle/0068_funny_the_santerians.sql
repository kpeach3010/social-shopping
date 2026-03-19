ALTER TABLE "orders" ADD COLUMN "paypal_order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paypal_capture_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount_usd" numeric(12, 2);