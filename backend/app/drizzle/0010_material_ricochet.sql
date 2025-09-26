ALTER TABLE "coupon_products" DROP CONSTRAINT "coupon_products_coupon_id_coupons_id_fk";
--> statement-breakpoint
ALTER TABLE "coupon_products" DROP CONSTRAINT "coupon_products_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "coupon_products" ADD CONSTRAINT "coupon_products_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coupon_products" ADD CONSTRAINT "coupon_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;