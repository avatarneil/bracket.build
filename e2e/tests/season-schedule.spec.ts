import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures/test-fixtures";
import {
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
    await expect(page.getByTestId("game-stats-dialog")).toBeVisible();
    await expect(page).toHaveURL(/game=schedule-401873297/);
    await expect(page.getByRole("tab", { name: "Stats" })).toBeVisible();
  });

  test("uses a schedule sidebar with inline live details on wide screens", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const sidebar = page.getByTestId("schedule-sidebar");
    const details = page.getByTestId("live-details-column");
    await expect(sidebar).toBeVisible();
    await expect(details).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const detailsBox = await details.boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    expect(detailsBox!.x).toBeGreaterThan(sidebarBox!.x + sidebarBox!.width);

    await page
      .getByRole("button", { name: "View live updates for Seattle Seahawks at Tennessee Titans" })
      .click();
    await expect(page.getByTestId("game-stats-panel")).toBeVisible();
    await expect(page.getByTestId("game-stats-dialog")).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "Stats" })).toBeVisible();
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
