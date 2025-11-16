ALTER TYPE "public"."asset_type" ADD VALUE 'other';--> statement-breakpoint
ALTER TYPE "public"."portfolio_tx_type" ADD VALUE 'TRANSFER_IN';--> statement-breakpoint
ALTER TYPE "public"."portfolio_tx_type" ADD VALUE 'TRANSFER_OUT';--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"ccy" char(3) NOT NULL,
	"as_of" timestamp NOT NULL,
	"rate_to_base" numeric(20, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ALTER TABLE "assets_master" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- ALTER TABLE "portfolio_tx" ADD COLUMN "asset_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fx_rates_user_ccy_asof_idx" ON "fx_rates" USING btree ("user_id","ccy","as_of");--> statement-breakpoint
ALTER TABLE "assets_master" ADD CONSTRAINT "assets_master_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "portfolio_tx" ADD CONSTRAINT "portfolio_tx_asset_id_assets_master_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_master_user_idx" ON "assets_master" USING btree ("user_id");