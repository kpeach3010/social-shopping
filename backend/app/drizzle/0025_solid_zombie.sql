CREATE TABLE "invite_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"creator_id" uuid,
	"product_id" uuid,
	"coupon_id" uuid,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"conversation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invite_links_token_unique" UNIQUE("token"),
	CONSTRAINT "invite_links_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" RENAME COLUMN "invitelink" TO "invite_token";--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_invitelink_unique";--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_group_order_id_group_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_invite_creator_product_coupon" ON "invite_links" USING btree ("creator_id","product_id","coupon_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_group_order_id_group_orders_id_fk" FOREIGN KEY ("group_order_id") REFERENCES "public"."group_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_invite_token_unique" UNIQUE("invite_token");