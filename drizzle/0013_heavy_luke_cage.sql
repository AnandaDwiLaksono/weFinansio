UPDATE "accounts" SET "balance" = '0' WHERE "balance" IS NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "balance" SET NOT NULL;