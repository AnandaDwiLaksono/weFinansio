ALTER TABLE "transactions" ADD COLUMN "cleared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reconciled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "statement_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "transactions_transfer_group_idx" ON "transactions" USING btree ("transfer_group_id");--> statement-breakpoint
CREATE INDEX "transactions_cleared_idx" ON "transactions" USING btree ("cleared");--> statement-breakpoint
CREATE INDEX "transactions_reconciled_idx" ON "transactions" USING btree ("reconciled");