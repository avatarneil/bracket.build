import { z } from "zod";
import { readJson, withAccount } from "@/lib/bracket-api";
import { parseBracketDocument } from "@/lib/bracket-document";
import { BracketStoreError, createBracket, listBrackets } from "@/lib/db/brackets";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return withAccount(request, (ownerId) =>
    listBrackets(
      ownerId,
      z.coerce
        .number()
        .int()
        .min(0)
        .max(10000)
        .parse(new URL(request.url).searchParams.get("page") ?? 0),
    ),
  );
}
export function POST(request: Request) {
  return withAccount(request, async (ownerId) => {
    const body = await readJson(request);
    let document;
    try {
      document = parseBracketDocument(body);
    } catch {
      throw new BracketStoreError(
        400,
        "Invalid picks or unsupported season. Your browser save has not been changed.",
      );
    }
    return createBracket(ownerId, document);
  });
}
