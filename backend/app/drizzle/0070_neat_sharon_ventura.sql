ALTER TYPE "public"."message_types" ADD VALUE 'stock_warning';--> statement-breakpoint
ALTER TYPE "public"."message_types" ADD VALUE 'stock_recovered';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'group_order_confirmed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'group_order_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'group_stock_warning';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'group_stock_recovered';