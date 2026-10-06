import { readJson, withAccount } from "@/lib/bracket-api";
import { getNotificationSettings, saveNotificationPreferences } from "@/lib/db/notifications";
import { notificationPreferencesSchema } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return withAccount(request, getNotificationSettings);
}
export function PATCH(request: Request) {
  return withAccount(request, async (ownerId) =>
    saveNotificationPreferences(
      ownerId,
      notificationPreferencesSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0)
        .parse(await readJson(request)),
    ),
  );
}
