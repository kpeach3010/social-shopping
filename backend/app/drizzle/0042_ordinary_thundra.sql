ALTER TABLE "friend_requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "friend_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."friend_status";--> statement-breakpoint
CREATE TYPE "public"."friend_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
ALTER TABLE "friend_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."friend_status";--> statement-breakpoint
ALTER TABLE "friend_requests" ALTER COLUMN "status" SET DATA TYPE "public"."friend_status" USING "status"::"public"."friend_status";