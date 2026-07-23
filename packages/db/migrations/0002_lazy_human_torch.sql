CREATE TYPE "public"."coupon_type" AS ENUM('percent', 'flat');--> statement-breakpoint
CREATE TYPE "public"."loyalty_txn_type" AS ENUM('earn', 'redeem', 'referral', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('requested', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "coupon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"type" "coupon_type" NOT NULL,
	"value" integer NOT NULL,
	"max_discount_paise" integer,
	"min_subtotal_paise" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"usage_limit" integer,
	"per_user_limit" integer DEFAULT 1 NOT NULL,
	"auto_apply" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "coupon_redemption" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"discount_paise" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"points" integer NOT NULL,
	"type" "loyalty_txn_type" NOT NULL,
	"description" text NOT NULL,
	"order_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"status" "payout_status" DEFAULT 'requested' NOT NULL,
	"upi_id" text NOT NULL,
	"pan_last4" text,
	"note" text,
	"processed_by" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral" (
	"referee_id" text PRIMARY KEY NOT NULL,
	"referrer_id" text NOT NULL,
	"code" text NOT NULL,
	"rewarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_code" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "discount_paise" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "coupon_discount_paise" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "points_redeemed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "points_discount_paise" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "points_earned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_coupon_id_coupon_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_processed_by_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referee_id_user_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrer_id_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_code" ADD CONSTRAINT "referral_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;