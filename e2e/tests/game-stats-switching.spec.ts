import { expect, test } from "../fixtures/test-fixtures";
import { mockGameBoxscore, mockPreseasonSchedule } from "../fixtures/mock-data";

for (const delayedFirst of [false, true]) {
  test(`switching games ignores ${delayedFirst ? "late responses" : "previous stats"}`, async ({
    page,
    seedUser: _seedUser,
    mockEspnApi: _mockEspnApi,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const first = mockPreseasonSchedule.games[0];
    const second = { ...first, id: "401900002", homeScore: 14, awayScore: 9 };
    await page.route("**/api/schedule**", (route) =>
      route.fulfill({
        json: {
          ...mockPreseasonSchedule,
          games: [first, second],
        },
      }),
    );
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    let firstRequested = false;
    let firstResponded = false;
    await page.route("**/api/game-stats/**", async (route) => {
      const eventId = route.request().url().split("/").pop()!;
      if (eventId === first.id) {
        firstRequested = true;
        if (delayedFirst) await firstGate;
      } else await secondGate;
      await route
        .fulfill({
          json: {
            ...mockGameBoxscore,
            eventId,
            homeTeamId: "TEN",
            awayTeamId: "SEA",
            homeScore: eventId === first.id ? 31 : 14,
            awayScore: eventId === first.id ? 27 : 9,
            isInProgress: true,
            isComplete: false,
          },
        })
        .catch(() => {}); // Switching intentionally aborts the first request.
      if (eventId === first.id) firstResponded = true;
    });
    await page.goto("/");
    await page.getByTestId(`live-dashboard-game-${first.id}`).click();
    const panel = page.getByTestId("game-stats-panel");
    await expect(panel).toBeVisible();
    await expect.poll(() => firstRequested).toBe(true);
    if (!delayedFirst)
      await expect(panel.locator("span").filter({ hasText: /^31$/ })).toBeVisible();
    await page.getByTestId(`live-dashboard-game-${second.id}`).click();
    await expect(panel.locator("span").filter({ hasText: /^14$/ })).toBeVisible();
    await expect(panel.locator("span").filter({ hasText: /^31$/ })).toHaveCount(0);
    releaseSecond();
    await expect(panel.getByText("Total Yards", { exact: true })).toBeVisible();
    releaseFirst();
    await expect.poll(() => firstResponded).toBe(true);
    await expect(panel.locator("span").filter({ hasText: /^14$/ })).toBeVisible();
    await expect(panel.locator("span").filter({ hasText: /^9$/ })).toBeVisible();
    await expect(panel.locator("span").filter({ hasText: /^31$/ })).toHaveCount(0);
  });
}

for (const scenario of ["reversed", "unknown", "wrong-event"] as const) {
  test(`score mapping handles ${scenario} IDs`, async ({
    page,
    seedUser: _seedUser,
    mockEspnApi: _mockEspnApi,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const game = mockPreseasonSchedule.games[0];
    await page.route("**/api/schedule**", (route) =>
      route.fulfill({ json: mockPreseasonSchedule }),
    );
    await page.route("**/api/game-stats/**", (route) =>
      route.fulfill({
        json: {
          ...mockGameBoxscore,
          eventId: scenario === "wrong-event" ? "999999999" : game.id,
          homeTeamId: scenario === "unknown" ? "UNKNOWN" : "SEA",
          awayTeamId: "TEN",
          homeScore: 27,
          awayScore: 31,
        },
      }),
    );
    await page.goto("/");
    await page.getByTestId(`live-dashboard-game-${game.id}`).click();
    const panel = page.getByTestId("game-stats-panel");
    if (scenario === "wrong-event") {
      await expect(panel.getByText("Failed to load game stats")).toBeVisible();
      await expect(panel.locator("span").filter({ hasText: /^3$/ })).toBeVisible();
      await expect(panel.locator("span").filter({ hasText: /^7$/ })).toBeVisible();
    } else {
      await expect(panel.getByText("Total Yards", { exact: true })).toBeVisible();
      await expect(panel.locator("span").filter({ hasText: /^31$/ })).toHaveCount(1);
      await expect(
        panel.locator("span").filter({ hasText: scenario === "unknown" ? /^7$/ : /^27$/ }),
      ).toBeVisible();
      if (scenario === "reversed") {
        // Super Bowl bracket order fixes AFC as home; ESPN may designate NFC home.
        // Distinct stats and leaders must follow the displayed teams after reversal.
        const yards = panel.getByText("Total Yards", { exact: true }).locator("..");
        await expect(yards).toHaveText(/385.*Total Yards.*310/);
        await panel.getByRole("tab", { name: "Leaders" }).click();
        const awayLeader = await panel.getByText("R. Wilson", { exact: true }).boundingBox();
        const homeLeader = await panel.getByText("J. Herbert", { exact: true }).boundingBox();
        expect(awayLeader!.x).toBeLessThan(homeLeader!.x);
      }
    }
  });
}
