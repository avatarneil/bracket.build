import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { BracketDocument } from "@/lib/bracket-document";

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
