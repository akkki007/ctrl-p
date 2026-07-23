CREATE TYPE "public"."design_status" AS ENUM('pending', 'approved', 'rejected', 'removed');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'upheld', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."wallet_txn_type" AS ENUM('commission', 'payout', 'adjustment');--> statement-breakpoint
CREATE TABLE "creator_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creator_profile_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "design_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"design_id" uuid NOT NULL,
	"reporter_id" text,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wall_design" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" "design_status" DEFAULT 'pending' NOT NULL,
	"originality_declared_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"type" "wallet_txn_type" NOT NULL,
	"description" text NOT NULL,
	"order_id" uuid,
	"design_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "wall_design_id" uuid;--> statement-breakpoint
ALTER TABLE "creator_profile" ADD CONSTRAINT "creator_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_report" ADD CONSTRAINT "design_report_design_id_wall_design_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."wall_design"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_report" ADD CONSTRAINT "design_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_report" ADD CONSTRAINT "design_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_design" ADD CONSTRAINT "wall_design_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_design" ADD CONSTRAINT "wall_design_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_design" ADD CONSTRAINT "wall_design_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_wall_design_id_wall_design_id_fk" FOREIGN KEY ("wall_design_id") REFERENCES "public"."wall_design"("id") ON DELETE no action ON UPDATE no action;