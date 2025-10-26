ALTER TABLE "messages" ADD COLUMN "last_message" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "last_message_at" timestamp with time zone;