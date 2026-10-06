import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { readJson, withAccount } from "@/lib/bracket-api";
import { getDatabase } from "@/lib/db";
import { subscriptionId } from "@/lib/db/notifications";
import { pushSubscriptions } from "@/lib/db/schema";

export function POST(request: Request) {
  return withAccount(request, async (ownerId) => {
    const { endpoint } = z
      .strictObject({ endpoint: z.string().max(2048) })
      .parse(await readJson(request));
    const [row] = await getDatabase()
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.ownerId, ownerId),
          eq(pushSubscriptions.id, subscriptionId(endpoint)),
        ),
      );
    return { enabled: !!row };
  });
}
