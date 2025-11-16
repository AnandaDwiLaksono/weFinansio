CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"base_currency" char(3) DEFAULT 'IDR' NOT NULL,
	"default_income_category_id" uuid,
	"default_expense_category_id" uuid,
	"offline_mode" text DEFAULT 'full' NOT NULL,
	"pwa_hints_dismissed" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_default_income_category_id_categories_id_fk" FOREIGN KEY ("default_income_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_default_expense_category_id_categories_id_fk" FOREIGN KEY ("default_expense_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;