ALTER TABLE "group_orders" DROP CONSTRAINT "group_orders_coupon_id_coupons_id_fk";
--> statement-breakpoint
ALTER TABLE "group_orders" ADD CONSTRAINT "group_orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;