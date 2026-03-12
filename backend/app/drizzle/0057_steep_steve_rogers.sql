ALTER TABLE "post_products" DROP CONSTRAINT "post_products_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "post_products" ADD CONSTRAINT "post_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE setNull ON UPDATE no action;