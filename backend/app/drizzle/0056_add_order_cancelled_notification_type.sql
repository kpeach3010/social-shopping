ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'order_cancelled';
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'order_paid';
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'order_confirmed';
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'order_rejected';
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'order_completed';
