import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures/test-fixtures";
import { mockGameBoxscore, mockRegularSchedule } from "../fixtures/mock-data";
import feed from "../../src/lib/fixtures/cfp-2025.json";
import { parseCollegeField } from "../../src/lib/football-schedule";

const teams = parseCollegeField(feed as unknown as Parameters<typeof parseCollegeField>[0])!;
const collegeGame = {
  ...mockRegularSchedule.games[0],
  league: "college-football",
  id: "401779840",
  homeTeam: teams.find((team) => team.seed === 8)!,
  awayTeam: teams.find((team) => team.seed === 9)!,
  isInProgress: true,
  isComplete: false,
};

test.beforeEach(async ({ page, mockEspnApi: _mock, seedUser: _user }) => {
  await page.route("**/api/schedule**", async (route) => {
    const url = new URL(route.request().url());
    const college = url.searchParams.get("league") === "college-football";
    const postseason = url.searchParams.get("phase") === "postseason";
    const seasonYear = Number(url.searchParams.get("season") ?? 2026);
    await route.fulfill({
      json: college
        ? {
            ...mockRegularSchedule,
            league: "college-football",
            seasonYear,
            phase: postseason ? "postseason" : "regular",
            currentPhase: "regular",
            phaseAvailability: { preseason: false, regular: true, postseason: true },
            week: postseason ? 999 : 4,
            weekLabel: postseason ? "CFP" : "Week 4",
            weeks: [
              {
                number: postseason ? 999 : 4,
                label: postseason ? "CFP" : "Week 4",
                startDate: "2026-09-21T07:00Z",
                endDate: "2026-09-28T06:59Z",
              },
            ],
            collegePlayoffTeams: seasonYear === 2025 && postseason ? teams : null,
            games: [
              collegeGame,
              ...Array.from({ length: 59 }, (_, i) => ({
                ...collegeGame,
                id: String(401800000 + i),
                isInProgress: false,
                isComplete: true,
              })),
            ],
          }
        : mockRegularSchedule,
    });
  });
  await page.route("**/api/game-stats/**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("league")).toBe("college-football");
    await route.fulfill({
      json: {
        ...mockGameBoxscore,
        eventId: url.pathname.split("/").pop(),
        homeTeamId: collegeGame.homeTeam.id,
        awayTeamId: collegeGame.awayTeam.id,
      },
    });
  });
});

test("switches leagues, browses all games, and opens college stats with deep links", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "College football", exact: true }).click();
  await expect(page).toHaveURL(/league=college-football/);
  await expect(page.getByRole("navigation", { name: "College football season" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Preseason/ })).toHaveCount(0);
  await expect(page.getByTestId("season-schedule")).toContainText("60 games");
  await expect(page.locator('[data-testid^="schedule-game-"]')).toHaveCount(25);
  await page.getByRole("button", { name: "Next games" }).click();
  await expect(page).toHaveURL(/gamesPage=2/);
  await page.getByRole("button", { name: "Previous games" }).click();
  await page.getByTestId("schedule-game-401779840").getByRole("button").click();
  await expect(page).toHaveURL(/game=schedule-401779840/);
  await expect(page.getByText("Total Yards", { exact: true })).toBeVisible();
  await expect(page.getByText("Ridiculous stat", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "NFL", exact: true }).click();
  await expect(page).not.toHaveURL(/league=|game=|gamesPage=/);
});

test("CFP picks advance, persist, clear invalid descendants, and stay isolated from NFL", async ({
  page,
}) => {
  await page.goto("/?league=college-football&phase=postseason&season=2025&week=999");
  const bracket = page.getByTestId("college-playoff-bracket");
  await expect(bracket).toContainText("2025 College Football Playoff");
  const first = bracket.getByRole("group", { name: "First round first-8", exact: true });
  const quarter = bracket.getByRole("group", { name: "Quarterfinals quarter-1", exact: true });
  await first.getByRole("button").nth(1).click();
  await quarter.getByRole("button").nth(1).click();
  await expect(bracket).toContainText("2 of 11 picks made");
  await page.reload();
  await expect(bracket).toContainText("2 of 11 picks made");
  await first.getByRole("button").nth(0).click();
  await expect(bracket).toContainText("1 of 11 picks made");
  await expect(quarter.getByRole("button", { pressed: true })).toHaveCount(0);
  await expect(page.getByTestId("bracket")).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="college-playoff-bracket"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("unpublished CFP field has an honest empty state", async ({ page }) => {
  await page.goto("/?league=college-football&phase=postseason&season=2026&week=999");
  await expect(page.getByTestId("college-playoff-bracket")).toContainText(
    "Picks unlock when the complete 12-team CFP field is published",
  );
  await expect(page.getByTestId("college-playoff-bracket").getByRole("button")).toHaveCount(0);
});

test("college layout fits mobile, laptop, and ultra-wide screens", async ({ page }) => {
  for (const width of [390, 1280, 2880]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?league=college-football&phase=postseason&season=2025&week=999");
    await expect(page.getByTestId("college-playoff-bracket")).toContainText("0 of 11 picks made");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `/tmp/bracket-college-${width}.png`, fullPage: false });
  }
});
