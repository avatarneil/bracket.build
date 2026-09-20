import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "@/app/api/cron/nfl-history/route";

test("cron rejects missing configuration and unauthenticated calls before importing", async () => {
  const saved = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(new Request("https://example.com/api/cron/nfl-history"))).status, 503);
    process.env.CRON_SECRET = "a-test-secret";
    assert.equal((await GET(new Request("https://example.com/api/cron/nfl-history"))).status, 401);
    assert.equal(
      (
        await GET(
          new Request("https://example.com/api/cron/nfl-history", {
            headers: { authorization: "Bearer b-test-secret" },
          }),
        )
      ).status,
      401,
    );
  } finally {
    if (saved == null) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  }
});
