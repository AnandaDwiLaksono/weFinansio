CREATE TYPE "public"."theme_mode_type" AS ENUM('light', 'dark');--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_default_income_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_default_expense_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "linked_account_id" uuid;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "start_date_period" numeric(2, 0) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "theme_mode" "theme_mode_type" DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "default_income_category_id";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "default_expense_category_id";