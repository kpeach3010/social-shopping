ALTER TABLE "group_orders" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "group_orders" ADD CONSTRAINT "group_orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN "min_member";