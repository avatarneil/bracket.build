import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { clerk } from "@clerk/testing/playwright";
import { test, expect } from "../fixtures/account-fixtures";
import { mockPreseasonSchedule } from "../fixtures/mock-data";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  followKey,
  type NotificationFollow,
} from "../../src/lib/notifications/types";

// Browser request interception does not cover service-worker-owned requests in
// WebKit. Worker event behavior has dedicated tests; these tests mock account APIs.
test.use({ serviceWorkers: "block" });

async function openSettings(page: Page) {
  // Clerk can complete setActive before its fallback navigation finishes.
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
}

async function mockNotifications(page: Page, publicKey: string | null = null) {
  let preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  let follows: NotificationFollow[] = [];
  let fail = false;
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: { ridiculousStatsEnabled: false } }),
  );
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  await page.route("**/api/notifications", (route) => {
    if (route.request().method() === "PATCH") {
      if (fail)
        return route.fulfill({
          status: 503,
          json: { error: "Your change wasn’t saved. Please retry." },
        });
      preferences = { ...preferences, ...route.request().postDataJSON() };
      return route.fulfill({ json: preferences });
    }
    return route.fulfill({ json: { preferences, follows, publicKey } });
  });
  await page.route("**/api/notifications/follows", (route) => {
    const body = route.request().postDataJSON();
    if (route.request().method() === "DELETE") {
      follows = follows.filter((follow) => followKey(follow) !== body.key);
      return route.fulfill({ json: { ok: true } });
    }
    follows = [...follows.filter((follow) => followKey(follow) !== followKey(body)), body];
    return route.fulfill({ json: body });
  });
  return {
    fail: () => {
      fail = true;
    },
    succeed: () => {
      fail = false;
    },
  };
}

test("notification APIs require an account and the manifest/worker are public", async ({
  page,
}) => {
  for (const endpoint of [
    "/api/notifications",
    "/api/notifications/follows",
    "/api/notifications/subscriptions",
    "/api/notifications/subscriptions/status",
  ]) {
    const response =
      endpoint === "/api/notifications"
        ? await page.request.get(endpoint)
        : endpoint.endsWith("follows")
          ? await page.request.put(endpoint, { data: {} })
          : await page.request.post(endpoint, { data: {} });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
  const worker = await page.request.get("/sw.js");
  expect(worker.status()).toBe(200);
  expect(worker.headers()["cache-control"]).toContain("no-store");
});

test("notification opt-ins persist, save failures roll back, and follows are scoped per season", async ({
  page,
  signInAccount,
  mockEspnApi: _mock,
  seedUser: _seed,
}) => {
  const state = await mockNotifications(page);
  await signInAccount();
  await openSettings(page);
  const master = page.getByRole("switch", { name: "Allow notifications", exact: true });
  await expect(master).not.toBeChecked();
  await master.focus();
  await page.keyboard.press("Space");
  await expect(master).toBeChecked();
  await expect(page.getByText("Push delivery isn’t configured", { exact: false })).toBeVisible();
  await page.getByRole("switch", { name: "Games heating up", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Games heating up", exact: true })).toBeChecked();
  state.fail();
  await master.click();
  await expect(
    page.getByText("Your change wasn’t saved. Please retry.", { exact: true }),
  ).toBeVisible();
  await expect(master).toBeChecked();
  state.succeed();
  await page.getByRole("combobox", { name: "Follow", exact: true }).selectOption("team");
  const team = mockPreseasonSchedule.games[0].homeTeam;
  await page.getByRole("combobox", { name: "Team", exact: true }).selectOption(team.id);
  await page.getByRole("button", { name: "Add follow", exact: true }).click();
  const kickoff = page.getByRole("checkbox", {
    name: `Kickoff for ${team.displayName}, 2026`,
    exact: true,
  });
  await expect(kickoff).toBeChecked();
  await kickoff.click();
  await expect(kickoff).not.toBeChecked();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(master).toBeChecked();
  await expect(kickoff).not.toBeChecked();
  const accessibility = await new AxeBuilder({ page })
    .include('section[aria-labelledby="notifications-heading"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page
    .getByRole("button", { name: `Unfollow ${team.displayName}, 2026`, exact: true })
    .click();
  await expect(page.getByText("No follows yet.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Undo unfollow", exact: true }).click();
  await expect(kickoff).not.toBeChecked();
});

test("game alert links preselect the correct game and support mobile and wide settings", async ({
  page,
  signInAccount,
  mockEspnApi: _mock,
  seedUser: _seed,
}, testInfo) => {
  await mockNotifications(page);
  await signInAccount();
  await page.waitForLoadState("networkidle");
  const game = mockPreseasonSchedule.games.find((item) => !item.isComplete)!;
  await page
    .getByRole("link", {
      name: `Set game alerts for ${game.awayTeam.displayName} at ${game.homeTeam.displayName}`,
      exact: true,
    })
    .click();
  await expect(page.getByRole("combobox", { name: "Game", exact: true })).toHaveValue(game.id);
  await page.getByRole("button", { name: "Add follow" }).click();
  await expect(page.getByText("Single game", { exact: false })).toBeVisible();
  for (const width of [390, 1366, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`notifications-${width}.png`),
      fullPage: true,
    });
  }
});

test("device permission is requested only after a click and denied permission has recovery guidance", async ({
  page,
  signInAccount,
  mockEspnApi: _mock,
  seedUser: _seed,
}) => {
  await mockNotifications(page, "B".repeat(87));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Notification test desktop",
    });
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Linux" });
    Object.defineProperty(window, "PushManager", { configurable: true, value: function () {} });
    let permission: NotificationPermission = "default";
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        get permission() {
          return permission;
        },
        requestPermission: async () => {
          permission = "denied";
          (window as unknown as { permissionRequests: number }).permissionRequests++;
          return permission;
        },
      },
    });
    (window as unknown as { permissionRequests: number }).permissionRequests = 0;
    const registration = { pushManager: { getSubscription: async () => null } };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register: async () => registration, ready: Promise.resolve(registration) },
    });
  });
  await signInAccount();
  await openSettings(page);
  await page.getByRole("switch", { name: "Allow notifications", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enable this device", exact: true })).toBeEnabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { permissionRequests: number }).permissionRequests,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Enable this device", exact: true }).click();
  await expect(page.getByText("Notifications are blocked.", { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { permissionRequests: number }).permissionRequests,
    ),
  ).toBe(1);
});

test("devices enroll explicitly, revoked enrollment stays off, and sign-out unsubscribes", async ({
  page,
  signInAccount,
  mockEspnApi: _mock,
  seedUser: _seed,
}) => {
  await mockNotifications(page, "B".repeat(87));
  let enrolled = false;
  let enrollments = 0;
  await page.route("**/api/notifications/subscriptions", (route) => {
    if (route.request().method() === "POST") {
      enrolled = true;
      enrollments++;
    } else enrolled = false;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/notifications/subscriptions/status", (route) =>
    route.fulfill({ json: { enabled: enrolled } }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Notification test desktop",
    });
    Object.defineProperty(window, "PushManager", { configurable: true, value: function () {} });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "granted", requestPermission: async () => "granted" },
    });
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Linux" });
    const key = Uint8Array.from(atob("B".repeat(87)), (character) => character.charCodeAt(0));
    let active = true;
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
      options: { applicationServerKey: key.buffer },
      toJSON: () => ({
        endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
        keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) },
      }),
      unsubscribe: async () => {
        active = false;
        return true;
      },
    };
    const registration = {
      pushManager: {
        getSubscription: async () => (active ? subscription : null),
        subscribe: async () => {
          active = true;
          return subscription;
        },
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: async () => registration,
        ready: Promise.resolve(registration),
        getRegistration: async () => registration,
      },
    });
  });
  await signInAccount();
  await openSettings(page);
  await page.getByRole("switch", { name: "Allow notifications", exact: true }).click();
  await page.getByRole("button", { name: "Enable this device", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Disable this device", exact: true }),
  ).toBeVisible();
  expect(enrollments).toBe(1);
  // Simulate revocation from a different device while this browser retains its subscription.
  enrolled = false;
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Enable this device", exact: true })).toBeEnabled();
  expect(enrollments).toBe(1);
  await page.getByRole("button", { name: "Enable this device", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Disable this device", exact: true }),
  ).toBeVisible();
  expect(enrollments).toBe(2);
  await clerk.signOut({ page });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("bracket-push-owner")))
    .toBeNull();
});

test("iPhone users receive Home Screen installation instructions", async ({
  page,
  signInAccount,
  mockEspnApi: _mock,
  seedUser: _seed,
}) => {
  await mockNotifications(page, "B".repeat(87));
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "iPhone" }),
  );
  await signInAccount();
  await openSettings(page);
  await expect(page.getByText("On iPhone or iPad (iOS 16.4+)", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enable this device", exact: true })).toHaveCount(
    0,
  );
});
