import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { inArray } from "drizzle-orm";
import { accountSettingsSchema } from "@/lib/account-settings";
import { getDatabase } from "./index";
import { accountSettings } from "./schema";
import { getAccountSettings, saveAccountSettings } from "./account-settings";

test("settings accept only an explicit boolean opt-in", () => {
  for (const input of [
    {},
    { ridiculousStatsEnabled: "true" },
    { ridiculousStatsEnabled: 1 },
    { ridiculousStatsEnabled: true, ownerId: "someone-else" },
  ])
    assert.equal(accountSettingsSchema.safeParse(input).success, false);
  assert.deepEqual(accountSettingsSchema.parse({ ridiculousStatsEnabled: true }), {
    ridiculousStatsEnabled: true,
  });
  assert.deepEqual(accountSettingsSchema.parse({ ridiculousStatsEnabled: false }), {
    ridiculousStatsEnabled: false,
  });
});

(process.env.TEST_DATABASE_URL ? test : test.skip)(
  "account settings default off, persist opt-in and opt-out, and isolate owners",
  async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const owners = [`settings-a-${randomUUID()}`, `settings-b-${randomUUID()}`];
    try {
      assert.equal((await getAccountSettings(owners[0])).ridiculousStatsEnabled, false);
      await saveAccountSettings(owners[0], { ridiculousStatsEnabled: true });
      await saveAccountSettings(owners[0], { ridiculousStatsEnabled: true });
      assert.equal((await getAccountSettings(owners[0])).ridiculousStatsEnabled, true);
      assert.equal((await getAccountSettings(owners[1])).ridiculousStatsEnabled, false);
      await saveAccountSettings(owners[1], { ridiculousStatsEnabled: true });
      await saveAccountSettings(owners[0], { ridiculousStatsEnabled: false });
      assert.equal((await getAccountSettings(owners[0])).ridiculousStatsEnabled, false);
      assert.equal((await getAccountSettings(owners[1])).ridiculousStatsEnabled, true);
    } finally {
      await getDatabase().delete(accountSettings).where(inArray(accountSettings.ownerId, owners));
    }
  },
);
