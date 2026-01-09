CREATE INDEX "idx_post_comments_post_id" ON "post_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_comments_parent_id" ON "post_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "idx_post_media_post_id" ON "post_media" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_products_post_id" ON "post_products" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_products_product_id" ON "post_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_posts_author_id" ON "posts" USING btree ("author_id");