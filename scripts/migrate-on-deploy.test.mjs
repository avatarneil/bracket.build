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
        env: { ...process.env, DATABASE_URL_UNPOOLED: "", DATABASE_URL: "", ...overrides },
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

test("local builds never require or connect to deployment storage", async () => {
  for (const VERCEL_ENV of ["", "development"]) {
    assert.equal((await run({ VERCEL_ENV, DATABASE_URL_UNPOOLED: "invalid" })).code, 0);
  }
});

test("deployment builds fail closed without matching direct and runtime connections", async () => {
  for (const VERCEL_ENV of ["production", "preview"]) {
    assert.equal((await run({ VERCEL_ENV })).code, 1);
    const result = await run({
      VERCEL_ENV,
      DATABASE_URL_UNPOOLED: "postgres://user:secret@ep-example-pooler.neon.tech/neondb",
      DATABASE_URL: "postgres://user:secret@ep-example-pooler.neon.tech/neondb",
    });
    assert.equal(result.code, 1);
    assert.ok(!result.output.includes("secret"));
    const mismatch = await run({
      VERCEL_ENV,
      DATABASE_URL: "postgres://user:secret@ep-preview-pooler.neon.tech/neondb",
      DATABASE_URL_UNPOOLED: "postgres://user:secret@ep-main.neon.tech/neondb",
    });
    assert.equal(mismatch.code, 1);
    assert.match(mismatch.output, /same database branch/);
  }
});

test(
  "preview and production migration retries are idempotent",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const env = {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL,
    };
    for (const result of await Promise.all([
      run({ ...env, VERCEL_ENV: "preview" }),
      run({ ...env, VERCEL_ENV: "production" }),
    ])) {
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, /schema is up to date/);
    }
  },
);
