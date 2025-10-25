ALTER TABLE "message_reads" DROP CONSTRAINT "message_reads_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_reads" ALTER COLUMN "last_read_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "message_reads" ALTER COLUMN "last_read_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_conversation_id_pk" PRIMARY KEY("user_id","conversation_id");--> statement-breakpoint
ALTER TABLE "message_reads" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "message_reads" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" DROP COLUMN "id";