CREATE TABLE "account_settings" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"ridiculous_stats_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
