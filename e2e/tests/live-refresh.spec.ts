import { expect, test } from "../fixtures/test-fixtures";
import { mockGameBoxscore, mockPreseasonSchedule } from "../fixtures/mock-data";

test("refreshes live schedule and selected stats every ten seconds", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 900 });
  let scheduleRequests = 0;
  let statsRequests = 0;
  let homeScore = 14;
  const game = mockPreseasonSchedule.games[0];
  await page.route("**/api/schedule**", (route) => {
    scheduleRequests++;
    return route.fulfill({ json: mockPreseasonSchedule });
  });
  await page.route("**/api/game-stats/**", (route) => {
    statsRequests++;
    return route.fulfill({
      json: {
        ...mockGameBoxscore,
        eventId: game.id,
        isInProgress: true,
        isComplete: false,
        homeTeamId: game.homeTeam.id,
        awayTeamId: game.awayTeam.id,
        homeScore,
        awayScore: 9,
      },
    });
  });
  await page.goto("/");
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  const panel = page.getByTestId("game-stats-panel");
  await expect(panel.locator("span").filter({ hasText: /^14$/ })).toBeVisible();
  const initialScheduleRequests = scheduleRequests;
  const initialStatsRequests = statsRequests;
  homeScore = 17;
  await page.clock.fastForward(10_000);
  await expect.poll(() => scheduleRequests).toBeGreaterThan(initialScheduleRequests);
  await expect.poll(() => statsRequests).toBeGreaterThan(initialStatsRequests);
  await expect(panel.locator("span").filter({ hasText: /^17$/ })).toBeVisible();
});

test("detects kickoff without reloading a schedule with no live games", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 900 });
  let started = false;
  await page.route("**/api/schedule**", (route) =>
    route.fulfill({
      json: {
        ...mockPreseasonSchedule,
        games: [{ ...mockPreseasonSchedule.games[0], isInProgress: started }],
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByText("No games are live", { exact: true })).toBeVisible();
  started = true;
  await page.clock.fastForward(60_000);
  await expect(page.getByTestId("live-game-count")).toHaveText("1");
});
