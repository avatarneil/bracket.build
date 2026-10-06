import { z } from "zod";
import { readJson, withAccount } from "@/lib/bracket-api";
import { deleteNotificationFollow, saveNotificationFollow } from "@/lib/db/notifications";
import { followSchema } from "@/lib/notifications/types";

export function PUT(request: Request) {
  return withAccount(request, async (ownerId) =>
    saveNotificationFollow(ownerId, followSchema.parse(await readJson(request))),
  );
}
export function DELETE(request: Request) {
  return withAccount(request, async (ownerId) =>
    deleteNotificationFollow(
      ownerId,
      z.strictObject({ key: z.string().min(1).max(120) }).parse(await readJson(request)).key,
    ),
  );
}
