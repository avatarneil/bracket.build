import { z } from "zod";

export const accountSettingsSchema = z.strictObject({
  ridiculousStatsEnabled: z.boolean(),
});

export type AccountSettings = z.infer<typeof accountSettingsSchema>;
export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = { ridiculousStatsEnabled: false };
