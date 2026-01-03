ALTER TABLE "transactions" ALTER COLUMN "occurred_at" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "occurred_at" SET DEFAULT now();