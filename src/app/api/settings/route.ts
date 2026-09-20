import { accountSettingsSchema } from "@/lib/account-settings";
import { readJson, withAccount } from "@/lib/bracket-api";
import { getAccountSettings, saveAccountSettings } from "@/lib/db/account-settings";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withAccount(request, getAccountSettings);
}

export function PATCH(request: Request) {
  return withAccount(request, async (ownerId) =>
    saveAccountSettings(ownerId, accountSettingsSchema.parse(await readJson(request))),
  );
}
