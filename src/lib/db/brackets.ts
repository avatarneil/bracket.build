import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { AccountBracket, BracketDocument } from "@/lib/bracket-document";
import { getDatabase } from "./index";
import { accountBrackets as table } from "./schema";

export class BracketStoreError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function own(ownerId: string, id: string) {
  return and(eq(table.ownerId, ownerId), eq(table.id, id));
}
function serialize(row: typeof table.$inferSelect): AccountBracket {
  return {
    ...row.document,
    id: row.id,
    revision: row.revision,
    shareToken: row.shareToken,
    sharedAt: row.sharedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listBrackets(ownerId: string, page = 0) {
  const rows = await getDatabase()
    .select()
    .from(table)
    .where(eq(table.ownerId, ownerId))
    .orderBy(desc(table.updatedAt), desc(table.id))
    .limit(21)
    .offset(page * 20);
  return { brackets: rows.slice(0, 20).map(serialize), hasMore: rows.length > 20 };
}

export async function getBracket(ownerId: string, id: string) {
  const [row] = await getDatabase().select().from(table).where(own(ownerId, id)).limit(1);
  if (!row) throw new BracketStoreError(404, "Bracket not found.");
  return serialize(row);
}

export async function createBracket(ownerId: string, document: BracketDocument) {
  // Browser imports and retried creates are idempotent, never overwriting account edits.
  await getDatabase()
    .insert(table)
    .values({ ownerId, id: document.state.id, document })
    .onConflictDoNothing({ target: [table.ownerId, table.id] });
  return getBracket(ownerId, document.state.id);
}

export async function updateBracket(
  ownerId: string,
  id: string,
  revision: number,
  document: BracketDocument,
) {
  const [row] = await getDatabase()
    .update(table)
    .set({ document, revision: sql`${table.revision} + 1`, updatedAt: new Date() })
    .where(and(own(ownerId, id), eq(table.revision, revision)))
    .returning();
  if (!row) {
    await getBracket(ownerId, id);
    throw new BracketStoreError(
      409,
      "This bracket changed on another device. Reload it or save your edits as a copy.",
    );
  }
  return serialize(row);
}

export async function deleteBracket(ownerId: string, id: string, revision: number) {
  const rows = await getDatabase()
    .delete(table)
    .where(and(own(ownerId, id), eq(table.revision, revision)))
    .returning({ id: table.id });
  if (!rows.length) {
    await getBracket(ownerId, id);
    throw new BracketStoreError(409, "This bracket changed. Refresh before deleting it.");
  }
}

export async function publishBracket(ownerId: string, id: string, revision: number) {
  const [row] = await getDatabase()
    .update(table)
    .set({
      shareToken: sql`coalesce(${table.shareToken}, ${randomUUID()})`,
      sharedDocument: table.document,
      sharedAt: new Date(),
      revision: sql`${table.revision} + 1`,
    })
    .where(and(own(ownerId, id), eq(table.revision, revision)))
    .returning();
  if (!row) {
    await getBracket(ownerId, id);
    throw new BracketStoreError(409, "This bracket changed. Reload before sharing.");
  }
  return serialize(row);
}

export async function unpublishBracket(ownerId: string, id: string, revision: number) {
  const [row] = await getDatabase()
    .update(table)
    .set({
      shareToken: null,
      sharedDocument: null,
      sharedAt: null,
      revision: sql`${table.revision} + 1`,
    })
    .where(and(own(ownerId, id), eq(table.revision, revision)))
    .returning();
  if (!row) {
    await getBracket(ownerId, id);
    throw new BracketStoreError(409, "This bracket changed. Reload before changing sharing.");
  }
  return serialize(row);
}

export async function getSharedBracket(token: string) {
  const [row] = await getDatabase()
    .select({ document: table.sharedDocument, sharedAt: table.sharedAt })
    .from(table)
    .where(eq(table.shareToken, token))
    .limit(1);
  if (!row?.document || !row.sharedAt)
    throw new BracketStoreError(
      404,
      "This shared bracket is unavailable or its owner stopped sharing it.",
    );
  // No account identifiers, private revisions, current edits, or session data leave this query.
  const { state, seasonYear } = row.document;
  return { seasonYear, state: { ...state, id: "shared" }, sharedAt: row.sharedAt.toISOString() };
}
