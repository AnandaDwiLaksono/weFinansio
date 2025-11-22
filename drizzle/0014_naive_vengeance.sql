ALTER TABLE "accounts" ALTER COLUMN "balance" SET DATA TYPE varchar(40);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DEFAULT '0';