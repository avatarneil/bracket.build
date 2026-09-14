import { z } from "zod";
import { readJson, withAccount } from "@/lib/bracket-api";
import { bracketId } from "@/lib/bracket-document";
import { publishBracket, unpublishBracket } from "@/lib/db/brackets";
type Context = { params: Promise<{ id: string }> };
const input = z.object({ revision: z.number().int().positive() });
export function POST(request: Request, context: Context) {
  return withAccount(request, async (ownerId) =>
    publishBracket(
      ownerId,
      bracketId.parse((await context.params).id),
      input.parse(await readJson(request)).revision,
    ),
  );
}
export function DELETE(request: Request, context: Context) {
  return withAccount(request, async (ownerId) =>
    unpublishBracket(
      ownerId,
      bracketId.parse((await context.params).id),
      input.parse(await readJson(request)).revision,
    ),
  );
}
