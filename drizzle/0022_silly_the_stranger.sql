ALTER TABLE "user_settings" ALTER COLUMN "theme_mode" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "theme_mode" DROP NOT NULL;