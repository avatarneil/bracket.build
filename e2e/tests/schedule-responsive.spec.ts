import { expect, test } from "../fixtures/test-fixtures";
import { mockGameBoxscore, mockPreseasonSchedule } from "../fixtures/mock-data";

test.beforeEach(async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
  await page.route("**/api/schedule**", (route) =>
    route.fulfill({
      json: {
        ...mockPreseasonSchedule,
        games: Array.from({ length: 16 }, (_, index) => ({
          ...mockPreseasonSchedule.games[0],
          id: String(401873297 + index),
          isInProgress: index < 2,
        })),
      },
    }),
  );
  await page.route("**/api/game-stats/**", (route) =>
    route.fulfill({
      json: {
        ...mockGameBoxscore,
        eventId: route.request().url().split("/").pop(),
        isInProgress: true,
        isComplete: false,
      },
    }),
  );
});

for (const width of [1152, 1194, 1210]) {
  test(`shows the desktop schedule and usable inline details at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 834 });
    await page.goto("/");

    const sidebar = page.getByTestId("schedule-sidebar");
    const dashboard = page.getByTestId("live-details-column");
    await expect(dashboard).toBeVisible();
    await expect(dashboard.getByTestId("live-game-count")).toHaveText("2");
    const sidebarBox = (await sidebar.boundingBox())!;
    const dashboardBox = (await dashboard.boundingBox())!;
    expect(dashboardBox.x).toBeGreaterThan(sidebarBox.x + sidebarBox.width);
    expect(dashboardBox.x + dashboardBox.width).toBeLessThanOrEqual(width);
    expect(sidebarBox.y + sidebarBox.height).toBeLessThanOrEqual(834);

    const list = sidebar.getByRole("list");
    expect(await list.evaluate((element) => element.scrollHeight)).toBeGreaterThan(
      await list.evaluate((element) => element.clientHeight),
    );
    await list.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.getByTestId("live-dashboard-game-401873297").click();
    const panel = page.getByTestId("game-stats-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("game-stats-dialog")).not.toBeVisible();
    await expect(panel.getByText("Total Yards", { exact: true })).toBeVisible();

    const panelBox = (await panel.boundingBox())!;
    for (const control of await panel.getByRole("tablist").getByRole("button").all()) {
      const box = (await control.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
    }
    for (const tab of await panel.getByRole("tab").all()) {
      const box = (await tab.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
    }
    await expect(panel.getByText("Win Probability Over Time")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Refresh" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(async () => (await sidebar.boundingBox())!.y).toBe(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

for (const width of [834, 1151]) {
  test(`keeps the single-column schedule and dialog at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1194 });
    await page.goto("/");
    await expect(page.getByTestId("live-details-column")).not.toBeVisible();
    await page.getByTestId("schedule-game-401873297").getByRole("button").click();
    await expect(page.getByTestId("game-stats-dialog")).toBeVisible();
    await expect(page.getByTestId("game-stats-panel")).not.toBeVisible();
  });
}

test("preserves the selected game and tab when rotating between portrait and landscape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto("/");
  await page.getByTestId("schedule-game-401873297").getByRole("button").click();
  const dialog = page.getByTestId("game-stats-dialog");
  await dialog.getByRole("tab", { name: "Momentum" }).click();
  await expect(page).toHaveURL(/game=schedule-401873297.*tab=momentum/);

  await page.setViewportSize({ width: 1194, height: 834 });
  const panel = page.getByTestId("game-stats-panel");
  await expect(dialog).not.toBeVisible();
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("tab", { name: "Momentum" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    "hidden",
  );

  await page.setViewportSize({ width: 834, height: 1194 });
  await expect(dialog).toBeVisible();
  await expect(panel).not.toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Momentum" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page).toHaveURL(/game=schedule-401873297.*tab=momentum/);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).not.toHaveURL(/game=/);
});
