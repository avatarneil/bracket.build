CREATE TABLE "account_brackets" (
	"owner_id" text NOT NULL,
	"id" text NOT NULL,
	"document" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"share_token" text,
	"shared_document" jsonb,
	"shared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_brackets_owner_id_id_pk" PRIMARY KEY("owner_id","id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_brackets_share_token_idx" ON "account_brackets" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "account_brackets_owner_updated_idx" ON "account_brackets" USING btree ("owner_id","updated_at","id");