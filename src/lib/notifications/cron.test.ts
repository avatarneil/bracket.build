import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "@/app/api/cron/notifications/route";

test("notification cron rejects unauthorized callers and preview dispatch, and safely skips absent credentials", async () => {
  const keys = ["CRON_SECRET", "VERCEL_ENV", "VAPID_PRIVATE_KEY"] as const;
  const saved = keys.map((key) => process.env[key]);
  const request = (secret?: string) =>
    new Request("https://bracket.build/api/cron/notifications", {
      headers: secret ? { authorization: `Bearer ${secret}` } : {},
    });
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(request())).status, 503);
    process.env.CRON_SECRET = "notification-test";
    assert.equal((await GET(request())).status, 401);
    assert.equal((await GET(request("wrong-secret"))).status, 401);
    process.env.VERCEL_ENV = "preview";
    assert.equal((await GET(request("notification-test"))).status, 403);
    delete process.env.VERCEL_ENV;
    delete process.env.VAPID_PRIVATE_KEY;
    const response = await GET(request("notification-test"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).skipped, "Web Push is not configured.");
    assert.match(response.headers.get("cache-control")!, /no-store/);
  } finally {
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
  }
});
