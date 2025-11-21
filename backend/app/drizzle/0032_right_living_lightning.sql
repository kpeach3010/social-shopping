ALTER TYPE "public"."role_enum" ADD VALUE 'system';--> statement-breakpoint
CREATE TABLE "group_order_member_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "group_order_members" DROP CONSTRAINT "group_order_members_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "group_order_member_items" ADD CONSTRAINT "group_order_member_items_member_id_group_order_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_order_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_order_member_items" ADD CONSTRAINT "group_order_member_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_member_variant" ON "group_order_member_items" USING btree ("member_id","variant_id");--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN "stackable";--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN "min_total_quantity";--> statement-breakpoint
ALTER TABLE "group_order_members" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "group_order_members" DROP COLUMN "quantity";