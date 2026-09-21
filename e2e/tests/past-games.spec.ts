import { expect, test } from "../fixtures/test-fixtures";
import { mockGameBoxscore, mockRegularSchedule } from "../fixtures/mock-data";

const finalGame = {
  ...mockRegularSchedule.games[0],
  homeScore: 24,
  awayScore: 17,
  winnerId: "TEN",
  isComplete: true,
  isInProgress: false,
  statusText: "Final",
};
const upcomingGame = { ...mockRegularSchedule.games[0], id: "401900002" };
const finalStats = {
  ...mockGameBoxscore,
  eventId: finalGame.id,
  homeTeamId: finalGame.homeTeam.id,
  awayTeamId: finalGame.awayTeam.id,
};
const historicalUrl = "/?phase=regular&season=2025&week=1";

test.beforeEach(async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
  await page.route("**/api/schedule**", (route) =>
    route.fulfill({
      json: {
        ...mockRegularSchedule,
        seasonYear: 2025,
        games: [finalGame, upcomingGame],
      },
    }),
  );
  await page.route("**/api/game-stats/**", (route) => route.fulfill({ json: finalStats }));
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844, variant: "dialog" },
  { name: "laptop", width: 1440, height: 900, variant: "panel" },
  { name: "ultrawide", width: 2880, height: 1800, variant: "panel" },
]) {
  test(`opens past games and restores their tabs on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto(historicalUrl);
    const row = page.getByTestId(`schedule-game-${finalGame.id}`);
    await expect(row).toContainText("Full stats");
    await expect(
      page.getByTestId(`schedule-game-${upcomingGame.id}`).getByRole("button"),
    ).toHaveCount(0);
    const openButton = row.getByRole("button", {
      name: "View final stats for Seattle Seahawks at Tennessee Titans",
    });
    await openButton.focus();
    await page.keyboard.press("Enter");

    const details = page.getByTestId(`game-stats-${viewport.variant}`);
    await expect(details.getByText("Total Yards", { exact: true })).toBeVisible();
    await expect(details.getByText("FINAL", { exact: true })).toBeVisible();
    await expect(details.locator("span").filter({ hasText: /^24$/ })).toBeVisible();
    await expect(details.locator("span").filter({ hasText: /^17$/ })).toBeVisible();
    await expect(details.getByTestId("live-field-position")).toHaveCount(0);
    await expect(details.getByRole("button", { name: "Refresh" })).toHaveCount(0);
    await expect(details).toHaveAccessibleName("Seahawks at Titans final game details");
    if (viewport.variant === "panel") {
      await expect(row).toHaveAttribute("aria-current", "true");
    }
    await expect(page).toHaveURL(new RegExp(`season=2025&week=1&game=schedule-${finalGame.id}`));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`past-game-${viewport.name}.png`),
      animations: "disabled",
    });

    await details.getByRole("tab", { name: "Leaders" }).click();
    await expect(details.getByText("R. Wilson", { exact: true })).toBeVisible();
    await details.getByRole("tab", { name: "Plays" }).click();
    await expect(details.getByRole("button", { name: /TD.*8 plays, 75 yards/ })).toBeVisible();
    await details.getByRole("tab", { name: "Momentum" }).click();
    await expect(details.getByText("Win Probability Over Time")).toBeVisible();
    await expect(page).toHaveURL(/tab=momentum/);

    await page.reload();
    await expect(details.getByRole("tab", { name: "Momentum" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(details.getByText("Win Probability Over Time")).toBeVisible();
    await expect(details.getByTestId("live-field-position")).toHaveCount(0);
    await details.getByRole("button", { name: "Close", exact: true }).click();
    await expect(details).not.toBeVisible();
    await expect(page).toHaveURL(historicalUrl);
  });
}

test("does not poll a final game and allows retry after a failed load", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 900 });
  let requests = 0;
  await page.route("**/api/game-stats/**", (route) => {
    requests++;
    return requests === 1
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.fulfill({ json: finalStats });
  });
  await page.goto(`${historicalUrl}&game=schedule-${finalGame.id}`);
  const panel = page.getByTestId("game-stats-panel");
  await expect(panel.getByText("Failed to load game stats")).toBeVisible();
  await expect(panel.getByText("FINAL", { exact: true })).toBeVisible();
  await expect(panel.getByTestId("live-field-position")).toHaveCount(0);
  await page.clock.fastForward(65_000);
  expect(requests).toBe(1);
  await panel.getByRole("button", { name: "Try Again" }).click();
  await expect(panel.getByText("Total Yards", { exact: true })).toBeVisible();
  await page.clock.fastForward(65_000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(requests).toBe(2);
});

test("switches an open live game to final and stops polling", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 900 });
  let completed = false;
  let requests = 0;
  await page.route("**/api/schedule**", (route) =>
    route.fulfill({
      json: {
        ...mockRegularSchedule,
        games: [{ ...finalGame, isComplete: completed, isInProgress: !completed }],
      },
    }),
  );
  await page.route("**/api/game-stats/**", (route) => {
    requests++;
    return route.fulfill({
      json: { ...finalStats, isComplete: completed, isInProgress: !completed },
    });
  });
  await page.goto("/?phase=regular");
  await page.getByTestId(`live-dashboard-game-${finalGame.id}`).click();
  const panel = page.getByTestId("game-stats-panel");
  await expect(panel.getByText("Total Yards", { exact: true })).toBeVisible();
  await expect(panel.getByTestId("live-field-position")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Refresh" })).toBeVisible();
  completed = true;
  await page.clock.fastForward(10_000);
  await expect(panel.getByText("FINAL", { exact: true })).toBeVisible();
  await expect(panel.getByTestId("live-field-position")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Refresh" })).toHaveCount(0);
  const finalRequests = requests;
  await page.clock.fastForward(65_000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(requests).toBe(finalRequests);
});
