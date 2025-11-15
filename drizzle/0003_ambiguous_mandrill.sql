ALTER TABLE "budgets" ADD COLUMN "carryover" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "start_amount" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "icon" varchar(7);