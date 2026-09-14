import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

function run(overrides) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL("./migrate-on-deploy.mjs", import.meta.url))],
      {
        env: { ...process.env, DATABASE_URL_UNPOOLED: "", ...overrides },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

test("local and preview builds never require or connect to production storage", async () => {
  for (const VERCEL_ENV of ["", "preview", "development"]) {
    assert.equal((await run({ VERCEL_ENV, DATABASE_URL_UNPOOLED: "invalid" })).code, 0);
  }
});

test("production fails closed without a direct connection", async () => {
  assert.equal((await run({ VERCEL_ENV: "production" })).code, 1);
  const result = await run({
    VERCEL_ENV: "production",
    DATABASE_URL_UNPOOLED: "postgres://user:secret@ep-example-pooler.neon.tech/neondb",
  });
  assert.equal(result.code, 1);
  assert.ok(!result.output.includes("secret"));
});

test(
  "production migration retries and concurrent builds are idempotent",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const env = { VERCEL_ENV: "production", DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL };
    for (const result of await Promise.all([run(env), run(env)])) {
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, /schema is up to date/);
    }
  },
);
