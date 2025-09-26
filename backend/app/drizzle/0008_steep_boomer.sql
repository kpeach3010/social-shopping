ALTER TABLE "colors" DROP CONSTRAINT "colors_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "sizes" DROP CONSTRAINT "sizes_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;