CREATE TYPE "public"."bulk_quote_status" AS ENUM('new', 'quoted', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "bulk_quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"quantity" integer NOT NULL,
	"details" text,
	"status" "bulk_quote_status" DEFAULT 'new' NOT NULL,
	"quoted_paise" integer,
	"admin_note" text,
	"handled_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillment_hub" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"pincode_prefixes" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset" ADD COLUMN "phash" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "hub_id" uuid;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "hub_city" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "courier_name" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "tracking_url" text;--> statement-breakpoint
ALTER TABLE "wall_design" ADD COLUMN "auto_flag_reason" text;--> statement-breakpoint
ALTER TABLE "bulk_quote" ADD CONSTRAINT "bulk_quote_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;