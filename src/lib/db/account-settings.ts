import "server-only";
import { eq } from "drizzle-orm";
import { DEFAULT_ACCOUNT_SETTINGS, type AccountSettings } from "@/lib/account-settings";
import { getDatabase } from "./index";
import { accountSettings } from "./schema";

export async function getAccountSettings(ownerId: string): Promise<AccountSettings> {
  const [settings] = await getDatabase()
    .select({ ridiculousStatsEnabled: accountSettings.ridiculousStatsEnabled })
    .from(accountSettings)
    .where(eq(accountSettings.ownerId, ownerId));
  return settings ?? { ...DEFAULT_ACCOUNT_SETTINGS };
}

export async function saveAccountSettings(ownerId: string, settings: AccountSettings) {
  const [saved] = await getDatabase()
    .insert(accountSettings)
    .values({ ownerId, ...settings })
    .onConflictDoUpdate({
      target: accountSettings.ownerId,
      set: { ...settings, updatedAt: new Date() },
    })
    .returning({ ridiculousStatsEnabled: accountSettings.ridiculousStatsEnabled });
  return saved;
}
