import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
function worker() {
  const handlers = new Map();
  const shown = [],
    opened = [];
  const self = {
    location: { origin: "https://bracket.build" },
    addEventListener: (kind, handler) => handlers.set(kind, handler),
    registration: { showNotification: async (...args) => shown.push(args) },
    clients: { matchAll: async () => [], openWindow: async (url) => opened.push(url) },
  };
  vm.runInNewContext(source, { self, URL });
  return { handlers, shown, opened };
}
test("push shows a visible notification, with a safe fallback for invalid payloads", async () => {
  const { handlers, shown } = worker();
  let pending;
  handlers.get("push")({
    data: {
      json: () => ({
        title: "Kickoff",
        body: "BUF at NE",
        tag: "game:start",
        url: "/?game=schedule-1",
      }),
    },
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  assert.equal(shown[0][0], "Kickoff");
  assert.equal(shown[0][1].tag, "game:start");
  handlers.get("push")({
    data: {
      json: () => {
        throw new Error();
      },
    },
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  assert.equal(shown[1][0], "bracket.build");
});
test("notification clicks preserve deep links and reject off-origin or unsafe targets", async () => {
  for (const [url, expected] of [
    ["/?league=nfl&game=schedule-1", "https://bracket.build/?league=nfl&game=schedule-1"],
    ["https://evil.test/", "https://bracket.build/"],
    ["javascript:alert(1)", "https://bracket.build/"],
    ["/api/notifications", "https://bracket.build/"],
  ]) {
    const { handlers, opened } = worker();
    let pending;
    handlers.get("notificationclick")({
      notification: { close() {}, data: { url } },
      waitUntil: (promise) => {
        pending = promise;
      },
    });
    await pending;
    assert.equal(opened[0], expected);
  }
});
