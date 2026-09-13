import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures/test-fixtures";
import {
  mockGameBoxscore,
  mockPostseasonSchedule,
  mockPreseasonSchedule,
  mockRegularSchedule,
} from "../fixtures/mock-data";

test.describe("Season schedules", () => {
  test.beforeEach(async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
    await page.unroute("**/api/schedule**");
    await page.route("**/api/schedule**", async (route) => {
      const url = new URL(route.request().url());
      const phase = url.searchParams.get("phase");
      const seasonYear = Number(url.searchParams.get("season") ?? 2026);
      const historicalBase = {
        ...mockPreseasonSchedule,
        seasonYear: 2025,
        phaseAvailability: { ...mockPreseasonSchedule.phaseAvailability, postseason: true },
      };
      const schedule =
        seasonYear === 2025 && phase === "postseason"
          ? mockPostseasonSchedule
          : seasonYear === 2025
            ? historicalBase
            : phase === "postseason"
              ? {
                  ...mockPostseasonSchedule,
                  currentPhase: "preseason" as const,
                  currentSeasonYear: 2026,
                  seasonYear: 2026,
                  phaseAvailability: {
                    ...mockPostseasonSchedule.phaseAvailability,
                    postseason: false,
                  },
                }
              : phase === "regular"
                ? mockRegularSchedule
                : mockPreseasonSchedule;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(schedule),
      });
    });
  });

  test("opens to the currently applicable season phase", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("season-navigation").locator('[aria-current="page"]')).toHaveText(
      /Pre|Preseason/,
    );
    await expect(page.getByTestId("season-schedule")).toBeVisible();
    await expect(page.getByTestId("schedule-game-401873297")).toContainText("8:02 - 1st");
    await expect(page.getByText("Aug 20, 2026")).toBeVisible();
    await expect(page.getByText("Aug 27, 2026")).toBeVisible();
    await expect(page.getByTestId("bracket")).not.toBeVisible();
  });

  test("can fetch the upcoming regular season and change weeks", async ({ page }) => {
    await page.goto("/");
    await page
      .getByTestId("season-navigation")
      .getByRole("button", { name: /Regular/ })
      .click();

    await expect(page).toHaveURL(/phase=regular/);
    await expect(page.getByRole("combobox", { name: "Schedule week" })).toHaveValue("1");
    await expect(page.getByTestId("schedule-game-401900001")).toBeVisible();

    await page.getByRole("button", { name: "Show Week 2" }).click();
    await expect(page).toHaveURL(/week=2/);
  });

  test("keeps the current postseason unavailable until its schedule is posted", async ({
    page,
  }) => {
    await page.goto("/");

    const postseason = page
      .getByTestId("season-navigation")
      .getByRole("button", { name: /Postseason/ });
    await expect(postseason).toBeDisabled();
    await expect(
      page.getByText(/postseason unlocks when the playoff schedule is posted/i),
    ).toBeVisible();

    await page.goto("/?phase=postseason&season=2026");
    await expect(
      page.getByRole("heading", { name: "Postseason schedule not posted" }),
    ).toBeVisible();
    await expect(page.getByTestId("bracket")).not.toBeVisible();
  });

  test("shows the prior season with its valid playoff seedings", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Season" }).selectOption("2025");
    await page
      .getByTestId("season-navigation")
      .getByRole("button", { name: /Postseason/ })
      .click();

    await expect(page).toHaveURL(/phase=postseason/);
    await expect(page).toHaveURL(/season=2025/);
    await expect(page.getByText(/2025–26 playoff seedings/i)).toBeVisible();
    await expect(page.getByTestId("bracket")).toBeVisible();
  });

  test("opens live schedule games in a dialog on vertical screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page
      .getByRole("button", { name: "View live updates for Seattle Seahawks at Tennessee Titans" })
      .click();
    const dialog = page.getByTestId("game-stats-dialog");
    const field = dialog.getByTestId("live-field-position");
    await expect(dialog).toBeVisible();
    await expect(field).toBeVisible();
    await expect(page).toHaveURL(/game=schedule-401873297/);
    await expect(page.getByRole("tab", { name: "Stats" })).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    const fieldBox = await field.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(fieldBox).not.toBeNull();
    expect(fieldBox!.height).toBeGreaterThan(dialogBox!.height * 0.28);
    expect(fieldBox!.height).toBeLessThan(dialogBox!.height * 0.4);
  });

  test("uses a left schedule rail with a multi-game dashboard on wide screens", async ({
    page,
  }) => {
    await page.unroute("**/api/schedule**");
    await page.route("**/api/schedule**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockPreseasonSchedule,
          games: [
            mockPreseasonSchedule.games[0],
            {
              ...mockPreseasonSchedule.games[0],
              id: "401873298",
              homeScore: 10,
              awayScore: 10,
              statusText: "2:14 - 3rd",
              quarter: 3,
              timeRemaining: "2:14",
              possession: "SEA",
              isRedZone: false,
            },
          ],
        }),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const sidebar = page.getByTestId("schedule-sidebar");
    const details = page.getByTestId("live-details-column");
    const dashboard = page.getByTestId("live-games-dashboard");
    await expect(sidebar).toBeVisible();
    await expect(details).toBeVisible();
    await expect(dashboard.getByTestId("live-game-count")).toHaveText("2");
    await expect(dashboard).toContainText("live games");
    await expect(page.getByTestId("live-dashboard-game-401873297")).toBeVisible();
    await expect(page.getByTestId("live-dashboard-game-401873298")).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const detailsBox = await details.boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    expect(detailsBox!.x).toBeGreaterThan(sidebarBox!.x + sidebarBox!.width);
    expect(sidebarBox!.x).toBeLessThan(50);

    await page.getByTestId("live-dashboard-game-401873297").click();
    await expect(page.getByTestId("game-stats-panel")).toBeVisible();
    await expect(page.getByTestId("live-field-position")).toBeVisible();
    await expect(page.getByTestId("game-stats-dialog")).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "Stats" })).toBeVisible();
  });

  test("keeps the field visible between drives on wide screens", async ({ page }) => {
    await page.unroute("**/api/game-stats/**");
    await page.route("**/api/game-stats/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockGameBoxscore, eventId: "401873297", fieldPosition: null }),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.getByTestId("live-dashboard-game-401873297").click();

    await expect(page.getByTestId("live-field-position")).toBeVisible();
    await expect(page.getByText(/between drives/i)).toBeVisible();
    await expect(page.getByText(/field position will update on the next drive/i)).toBeVisible();
  });

  test("scrolls the desktop game list with the wheel without moving the page", async ({ page }) => {
    await page.route("**/api/schedule**", (route) =>
      route.fulfill({
        json: {
          ...mockPreseasonSchedule,
          games: Array.from({ length: 16 }, (_, index) => ({
            ...mockPreseasonSchedule.games[0],
            id: String(401873297 + index),
            isInProgress: index === 0,
          })),
        },
      }),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const list = page.getByTestId("season-schedule").getByRole("list");
    await expect(list).toBeVisible();
    await expect
      .poll(() => list.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
      .toBeLessThanOrEqual(900);
    await list.hover();
    await page.mouse.wheel(0, 450);
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.mouse.wheel(0, -450);
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
  });

  test("does not show bracket actions outside the postseason", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("mobile-action-bar")).not.toBeVisible();
    await expect(page.getByTestId("view-toggle")).not.toBeVisible();
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("season-schedule")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousViolations = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(seriousViolations).toEqual([]);
  });
});
