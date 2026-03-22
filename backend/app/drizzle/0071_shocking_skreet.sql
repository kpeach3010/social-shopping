ALTER TABLE "messages" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DEFAULT 'text'::text;--> statement-breakpoint
DROP TYPE "public"."message_types";--> statement-breakpoint
CREATE TYPE "public"."message_types" AS ENUM('text', 'image', 'file', 'system');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DEFAULT 'text'::"public"."message_types";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DATA TYPE "public"."message_types" USING "type"::"public"."message_types";