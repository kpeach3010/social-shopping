CREATE INDEX "idx_colors_product_id" ON "colors" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_colors_product_name" ON "colors" USING btree ("product_id","name");--> statement-breakpoint
CREATE INDEX "idx_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variants_product_color" ON "product_variants" USING btree ("product_id","color_id");--> statement-breakpoint
CREATE INDEX "idx_sizes_product_id" ON "sizes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_sizes_product_name" ON "sizes" USING btree ("product_id","name");