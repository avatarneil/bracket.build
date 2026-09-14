import { z } from "zod";
import { json } from "@/lib/bracket-api";
import { BracketStoreError, getSharedBracket } from "@/lib/db/brackets";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = z.uuid().safeParse((await params).token);
  if (!token.success) return json({ error: "Shared bracket not found." }, 404);
  try {
    return json(await getSharedBracket(token.data));
  } catch (error) {
    if (error instanceof BracketStoreError) return json({ error: error.message }, error.status);
    return json({ error: "Unable to load this bracket. Please retry." }, 503);
  }
}
