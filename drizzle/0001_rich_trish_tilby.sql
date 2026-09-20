CREATE TABLE "historical_imports" (
	"season" integer PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone NOT NULL,
	"row_count" integer NOT NULL,
	"source_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historical_team_games" (
	"game_id" text NOT NULL,
	"event_id" text,
	"season" integer NOT NULL,
	"game_date" date NOT NULL,
	"phase" text NOT NULL,
	"team" text NOT NULL,
	"opponent" text NOT NULL,
	"location" text NOT NULL,
	"metrics" jsonb NOT NULL,
	CONSTRAINT "historical_team_games_game_id_team_pk" PRIMARY KEY("game_id","team")
);
--> statement-breakpoint
CREATE INDEX "historical_team_games_team_date_idx" ON "historical_team_games" USING btree ("team","game_date");--> statement-breakpoint
CREATE INDEX "historical_team_games_event_idx" ON "historical_team_games" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "historical_team_games_season_idx" ON "historical_team_games" USING btree ("season");