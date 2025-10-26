ALTER TABLE "conversation_members" ADD COLUMN "last_message" text;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD COLUMN "last_message_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "last_message";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "last_message_at";