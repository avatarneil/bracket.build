import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
  date,
} from "drizzle-orm/pg-core";
import type { BracketDocument } from "@/lib/bracket-document";
import type { Measurements, Phase, Location } from "@/lib/ridiculous-stats/types";

export const accountSettings = pgTable("account_settings", {
  ownerId: text("owner_id").primaryKey(),
  ridiculousStatsEnabled: boolean("ridiculous_stats_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountBrackets = pgTable(
  "account_brackets",
  {
    ownerId: text("owner_id").notNull(),
    id: text("id").notNull(),
    document: jsonb("document").$type<BracketDocument>().notNull(),
    revision: integer("revision").notNull().default(1),
    shareToken: text("share_token"),
    sharedDocument: jsonb("shared_document").$type<BracketDocument>(),
    sharedAt: timestamp("shared_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    uniqueIndex("account_brackets_share_token_idx").on(table.shareToken),
    index("account_brackets_owner_updated_idx").on(table.ownerId, table.updatedAt, table.id),
  ],
);

// One row per franchise per game, including scheduled games and missing box
// scores. Retaining gaps prevents a partial archive from asserting a record.
export const historicalTeamGames = pgTable(
  "historical_team_games",
  {
    gameId: text("game_id").notNull(),
    eventId: text("event_id"),
    season: integer("season").notNull(),
    date: date("game_date", { mode: "string" }).notNull(),
    phase: text("phase").$type<Phase>().notNull(),
    team: text("team").notNull(),
    opponent: text("opponent").notNull(),
    location: text("location").$type<Location>().notNull(),
    metrics: jsonb("metrics").$type<Measurements>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.team] }),
    index("historical_team_games_team_date_idx").on(table.team, table.date),
    index("historical_team_games_event_idx").on(table.eventId),
    index("historical_team_games_season_idx").on(table.season),
  ],
);

export const historicalImports = pgTable("historical_imports", {
  season: integer("season").primaryKey(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull(),
  rowCount: integer("row_count").notNull(),
  sourceHash: text("source_hash").notNull(),
});
