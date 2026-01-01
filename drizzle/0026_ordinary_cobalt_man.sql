ALTER TABLE "goal_contributions" ALTER COLUMN "occurred_at" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "goal_contributions" ALTER COLUMN "occurred_at" SET DEFAULT now();