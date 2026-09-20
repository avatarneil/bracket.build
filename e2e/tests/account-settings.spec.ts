import { clerk } from "@clerk/testing/playwright";
import { test, expect } from "../fixtures/account-fixtures";
import { mockPreseasonSchedule } from "../fixtures/mock-data";

const game = mockPreseasonSchedule.games[0];
const gameUrl = `/?phase=preseason&season=2026&week=3&game=schedule-${game.id}&tab=stats&ridiculous=${game.id}:0`;

test("guests cannot see settings or bypass the insight gate with a saved URL", async ({
  page,
  seedUser: _seed,
  mockEspnApi: _mock,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let insightCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/ridiculous-stats/")) insightCalls++;
  });
  await page.goto(gameUrl);
  await expect(page.getByText("Total Yards", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Ridiculous stats" })).toHaveCount(0);
  expect(insightCalls).toBe(0);
  for (const endpoint of ["/api/settings", `/api/ridiculous-stats/${game.id}`]) {
    const response = await page.request.get(endpoint);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  expect(
    (
      await page.request.patch("/api/settings", { data: { ridiculousStatsEnabled: true } })
    ).status(),
  ).toBe(401);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("settings default off, save across reloads, and hide insights again after opting out", async ({
  page,
  signInAccount,
  testAccount,
  seedUser: _seed,
  mockEspnApi: _mock,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let enabled = false;
  await page.route("**/api/settings", (route) => {
    expect(route.request().headers()["x-bracket-owner"]).toBe(testAccount.userId);
    if (route.request().method() === "PATCH")
      enabled = route.request().postDataJSON().ridiculousStatsEnabled;
    return route.fulfill({ json: { ridiculousStatsEnabled: enabled } });
  });
  await signInAccount();
  await page.goto(gameUrl);
  await expect(page.getByText("Total Yards", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ridiculous stats" })).toHaveCount(0);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "Ridiculous stats BETA", exact: true });
  await expect(toggle).not.toBeChecked();
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toBeChecked();
  await expect(page.getByRole("status")).toContainText("Settings saved.");
  await page.reload();
  await expect(toggle).toBeChecked();
  await page.getByRole("link", { name: "Back to games" }).click();
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  await expect(page.getByRole("button", { name: "Generate ridiculous stat" })).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.goto(gameUrl);
  await expect(page.getByText("Total Yards", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ridiculous stats" })).toHaveCount(0);
});

test("failed saves keep the last preference and signing out removes opted-in insights", async ({
  page,
  signInAccount,
  seedUser: _seed,
  mockEspnApi: _mock,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let enabled = false;
  let fail = true;
  await page.route("**/api/settings", (route) => {
    if (route.request().method() === "PATCH") {
      if (fail) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
      enabled = route.request().postDataJSON().ridiculousStatsEnabled;
    }
    return route.fulfill({ json: { ridiculousStatsEnabled: enabled } });
  });
  await signInAccount();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "Ridiculous stats BETA", exact: true });
  await toggle.click();
  await expect(
    page.getByText("Your change wasn’t saved. Please try the switch again."),
  ).toBeVisible();
  await expect(toggle).not.toBeChecked();
  fail = false;
  await toggle.click();
  await expect(toggle).toBeChecked();
  await page.getByRole("link", { name: "Back to games" }).click();
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  await expect(page.getByRole("region", { name: "Ridiculous stats" })).toBeVisible();
  await clerk.signOut({ page });
  await expect(page.getByRole("region", { name: "Ridiculous stats" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
});

for (const width of [390, 1194, 2560]) {
  test(`account settings fit a ${width}px viewport`, async ({
    page,
    signInAccount,
    seedUser: _seed,
    mockEspnApi: _mock,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/settings", (route) =>
      route.fulfill({ json: { ridiculousStatsEnabled: false } }),
    );
    await signInAccount();
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(
      page.getByRole("switch", { name: "Ridiculous stats BETA", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`settings-${width}.png`) });
  });
}
