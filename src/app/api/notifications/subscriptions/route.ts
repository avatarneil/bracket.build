import { z } from "zod";
import { readJson, withAccount } from "@/lib/bracket-api";
import { deletePushSubscription, savePushSubscription } from "@/lib/db/notifications";

export function POST(request: Request) {
  return withAccount(request, async (ownerId) =>
    savePushSubscription(ownerId, await readJson(request), new URL(request.url).origin),
  );
}
export function DELETE(request: Request) {
  return withAccount(request, async (ownerId) => {
    const body = z
      .union([
        z.strictObject({ endpoint: z.string().max(2048) }),
        z.strictObject({ allDevices: z.literal(true) }),
      ])
      .parse(await readJson(request));
    return deletePushSubscription(ownerId, "endpoint" in body ? body.endpoint : undefined);
  });
}
