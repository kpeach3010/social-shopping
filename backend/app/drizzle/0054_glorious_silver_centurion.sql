ALTER TABLE "reviews" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_coupon_products_coupon_id" ON "coupon_products" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "idx_coupons_starts_at" ON "coupons" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "idx_coupons_ends_at" ON "coupons" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "idx_order_items_product_id" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_variant_id" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_variants_price" ON "product_variants" USING btree ("price");--> statement-breakpoint
CREATE INDEX "idx_variants_stock" ON "product_variants" USING btree ("stock");--> statement-breakpoint
CREATE INDEX "idx_reviews_product_id" ON "reviews" USING btree ("product_id");