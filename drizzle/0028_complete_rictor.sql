ALTER TABLE "assets_master" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."asset_type";--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('stock', 'mutual_fund', 'bond', 'government_bond', 'fixed_deposit', 'precious_metal', 'crypto', 'savings_account', 'foreign_currency', 'other');--> statement-breakpoint
ALTER TABLE "assets_master" ALTER COLUMN "type" SET DATA TYPE "public"."asset_type" USING "type"::"public"."asset_type";--> statement-breakpoint
DROP INDEX "assets_master_user_idx";--> statement-breakpoint
ALTER TABLE "asset_prices" ALTER COLUMN "symbol" SET DATA TYPE varchar(20);--> statement-breakpoint

-- Drop FK constraints first to avoid dependency errors
ALTER TABLE "holdings" DROP CONSTRAINT IF EXISTS "holdings_symbol_assets_master_symbol_fk";--> statement-breakpoint
ALTER TABLE "portfolio_tx" DROP CONSTRAINT IF EXISTS "portfolio_tx_symbol_assets_master_symbol_fk";--> statement-breakpoint
ALTER TABLE "asset_prices" DROP CONSTRAINT IF EXISTS "asset_prices_symbol_assets_master_symbol_fk";--> statement-breakpoint

-- Now drop PK safely
ALTER TABLE "assets_master" DROP CONSTRAINT IF EXISTS "assets_master_pkey";--> statement-breakpoint

-- Update varchar length on all tables
ALTER TABLE "assets_master" ALTER COLUMN "symbol" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "holdings" ALTER COLUMN "symbol" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "portfolio_tx" ALTER COLUMN "symbol" SET DATA TYPE varchar(20);--> statement-breakpoint

-- Add new ID column as PK
ALTER TABLE "assets_master" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "issuer" varchar(160);--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "isin" varchar(20);--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "source" varchar(50);--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "coupon" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "interest_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "maturity_date" date;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "minimum_unit" numeric(28, 8) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "decimals" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assets_master" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint

-- Add unique constraint on symbol to allow FK references
CREATE UNIQUE INDEX "assets_master_symbol_uq" ON "assets_master" USING btree ("symbol");--> statement-breakpoint

-- Recreate FK constraints with correct syntax
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_symbol_assets_master_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "assets_master"("symbol") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "portfolio_tx" ADD CONSTRAINT "portfolio_tx_symbol_assets_master_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "assets_master"("symbol") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_symbol_assets_master_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "assets_master"("symbol") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_master_user_symbol_uq" ON "assets_master" USING btree ("user_id","symbol");--> statement-breakpoint
CREATE INDEX "assets_master_user_type_idx" ON "assets_master" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "assets_master_user_active_idx" ON "assets_master" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_master_isin_uq" ON "assets_master" USING btree ("isin");