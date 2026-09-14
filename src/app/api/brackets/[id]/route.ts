import { z } from "zod";
import { readJson, withAccount } from "@/lib/bracket-api";
import { bracketId, parseBracketDocument } from "@/lib/bracket-document";
import { BracketStoreError, deleteBracket, getBracket, updateBracket } from "@/lib/db/brackets";

type Context = { params: Promise<{ id: string }> };
const revisionInput = z.object({ revision: z.number().int().positive() });
export function GET(request: Request, context: Context) {
  return withAccount(request, async (ownerId) =>
    getBracket(ownerId, bracketId.parse((await context.params).id)),
  );
}
export function PUT(request: Request, context: Context) {
  return withAccount(request, async (ownerId) => {
    const id = bracketId.parse((await context.params).id);
    const body = await readJson(request);
    const { revision } = revisionInput.parse(body);
    let document;
    try {
      document = parseBracketDocument(body);
    } catch {
      throw new BracketStoreError(400, "Invalid picks or unsupported season.");
    }
    if (document.state.id !== id) throw new BracketStoreError(400, "Bracket ID does not match.");
    return updateBracket(ownerId, id, revision, document);
  });
}
export function DELETE(request: Request, context: Context) {
  return withAccount(request, async (ownerId) => {
    const { revision } = revisionInput.parse(await readJson(request));
    await deleteBracket(ownerId, bracketId.parse((await context.params).id), revision);
    return { deleted: true };
  });
}
