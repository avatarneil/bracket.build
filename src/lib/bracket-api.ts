import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BracketStoreError } from "@/lib/db/brackets";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function withAccount(request: Request, action: (ownerId: string) => Promise<unknown>) {
  try {
    const { userId } = await auth();
    if (!userId) return json({ error: "Sign in to access your saved brackets." }, 401);
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        return json({ error: "Invalid request origin." }, 403);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "Send application/json." }, 415);
    }
    return json(await action(userId));
  } catch (error) {
    if (error instanceof BracketStoreError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError || error instanceof SyntaxError)
      return json({ error: "Invalid bracket request." }, 400);
    console.error(
      "Bracket storage request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json(
      {
        error:
          "Account storage is temporarily unavailable. Your browser picks are safe; please retry.",
      },
      503,
    );
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new BracketStoreError(413, "Bracket is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
