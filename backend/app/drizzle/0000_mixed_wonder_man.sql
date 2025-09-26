CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."role_enum" AS ENUM('admin', 'customer', 'staff');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(120),
	"phone" varchar(20),
	"gender" "gender",
	"role" "role_enum" DEFAULT 'customer' NOT NULL,
	"date_of_birth" date,
	"province" varchar(120),
	"district" varchar(120),
	"ward" varchar(120),
	"address_detail" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
