CREATE INDEX "idx_conversation_members_user_id" ON "conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_members_conversation_id" ON "conversation_members" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_type" ON "conversations" USING btree ("conversation_types");--> statement-breakpoint
CREATE INDEX "idx_conversations_group_order_id" ON "conversations" USING btree ("group_order_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_invite_token" ON "conversations" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "idx_group_order_member_items_member_id" ON "group_order_member_items" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_group_order_members_group_id" ON "group_order_members" USING btree ("group_order_id");--> statement-breakpoint
CREATE INDEX "idx_group_orders_product_id" ON "group_orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_group_orders_creator_id" ON "group_orders" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_group_orders_status_created" ON "group_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_invite_links_token" ON "invite_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_invite_creator_product_coupon" ON "invite_links" USING btree ("creator_id","product_id","coupon_id");--> statement-breakpoint
CREATE INDEX "idx_invite_links_expires_at" ON "invite_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_sender_id" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_group_order_id" ON "orders" USING btree ("group_order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");