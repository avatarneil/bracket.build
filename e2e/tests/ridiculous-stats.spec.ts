import { expect, test } from "../fixtures/test-fixtures";
import { mockGameBoxscore, mockPreseasonSchedule } from "../fixtures/mock-data";
import type { RidiculousResponse } from "../../src/lib/ridiculous-stats/types";

const game = mockPreseasonSchedule.games[0];
function response(eventId = game.id, index = 0): RidiculousResponse {
  return {
    eventId,
    count: 2,
    index,
    live: index === 0,
    asOf: 1756000000000,
    fact: {
      id: `fact-${index}`,
      kind: index ? "since" : "record",
      metric: index ? "fieldGoals" : "rushingYards",
      metricLabel: index ? "field goals made" : "rushing yards",
      value: index ? 5 : 200,
      team: "Seattle Seahawks",
      text: index
        ? "Seattle recorded five field goals in this game — their first with at least five against bird-named opponents since November 1, 2020."
        : "Seattle have 200 rushing yards so far against animal-named opponents.",
      filters: ["regular-season games", "against animal-named opponents"],
      sampleSize: 12,
      coverageStart: "2003 season",
      cutoff: "2025-09-01",
      receipts: Array.from({ length: 12 }, (_, i) => ({
        gameId: `old-${i}`,
        eventId: String(9000 + i),
        date: `2024-11-${String(i + 1).padStart(2, "0")}`,
        opponent: `Opponent ${i + 1}`,
        location: "home",
        value: 100 + i,
      })),
    },
  };
}

test("generates on demand, shows receipts, paginates, and restores URL state", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let calls = 0;
  await page.route("**/api/ridiculous-stats/**", (route) => {
    calls++;
    return route.fulfill({
      json: response(game.id, Number(new URL(route.request().url()).searchParams.get("index"))),
    });
  });
  await page.goto("/");
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  const card = page.getByRole("region", { name: "Ridiculous stats" });
  await expect(card.getByRole("button", { name: "Generate ridiculous stat" })).toBeVisible();
  expect(calls).toBe(0);
  await card.getByRole("button", { name: "Generate ridiculous stat" }).click();
  await expect(card.getByText(/Seattle have 200 rushing/)).toBeVisible();
  await expect(card.getByText(/Live snapshot/)).toBeVisible();
  await card.getByRole("button", { name: "Show the receipts" }).click();
  await expect(card.getByRole("table").getByRole("row")).toHaveCount(11);
  await card.getByRole("button", { name: "Next", exact: true }).click();
  await expect(card.getByText("Opponent 11", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/receipts=.*%3A1/);
  await page.reload();
  await expect(card.getByText("Opponent 11", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Another ridiculous stat" }).click();
  await expect(card.getByText(/Seattle recorded five field goals/)).toBeVisible();
  await expect(card.getByText(/First since/)).toBeVisible();
  await expect(card.getByRole("table")).toHaveCount(0);
});

test("recovers from unavailable and empty history without affecting normal stats", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let calls = 0;
  await page.route("**/api/ridiculous-stats/**", (route) => {
    calls++;
    if (calls === 1) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    if (calls === 2)
      return route.fulfill({
        json: {
          ...response(),
          fact: null,
          count: 0,
          message: "No well-supported ridiculous stat for this game yet. Try another game.",
        },
      });
    return route.fulfill({ json: response() });
  });
  await page.goto("/");
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  const card = page.getByRole("region", { name: "Ridiculous stats" });
  await card.getByRole("button", { name: "Generate ridiculous stat" }).click();
  await expect(card.getByText(/temporarily unavailable/)).toBeVisible();
  await expect(page.getByText("Total Yards", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Try again" }).click();
  await expect(card.getByText(/No well-supported/)).toBeVisible();
  await card.getByRole("button", { name: "Try again" }).click();
  await expect(card.getByText(/Seattle have 200 rushing/)).toBeVisible();
});

test("switching games cannot show a late response from the previous game", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const other = { ...game, id: "401900002" };
  await page.route("**/api/schedule**", (route) =>
    route.fulfill({ json: { ...mockPreseasonSchedule, games: [game, other] } }),
  );
  await page.route("**/api/game-stats/**", (route) =>
    route.fulfill({
      json: {
        ...mockGameBoxscore,
        eventId: new URL(route.request().url()).pathname.split("/").pop(),
      },
    }),
  );
  let release!: () => void;
  let requested = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ridiculous-stats/**", async (route) => {
    requested = true;
    await gate;
    await route.fulfill({ json: response() }).catch(() => {});
  });
  await page.goto("/");
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  await page.getByRole("button", { name: "Generate ridiculous stat" }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByTestId(`schedule-game-${other.id}`).getByRole("button").click();
  release();
  await expect(page.getByRole("button", { name: "Generate ridiculous stat" })).toBeVisible();
  await expect(page.getByText(/Seattle have 200 rushing/)).toHaveCount(0);
});

test("live box-score polling leaves the insight, receipts, and card height unchanged", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.install();
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let boxscoreCalls = 0;
  await page.route("**/api/game-stats/**", (route) => {
    boxscoreCalls++;
    return route.fulfill({
      json: {
        ...mockGameBoxscore,
        eventId: game.id,
        isComplete: false,
        isInProgress: true,
        fetchedAt: 1756000000000 + boxscoreCalls * 10_000,
        teamStats: {
          ...mockGameBoxscore.teamStats,
          home: { ...mockGameBoxscore.teamStats.home, totalYards: 385 + boxscoreCalls },
        },
      },
    });
  });
  let insightCalls = 0;
  await page.route("**/api/ridiculous-stats/**", (route) => {
    insightCalls++;
    return route.fulfill({ json: response() });
  });
  await page.goto("/");
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  const card = page.getByRole("region", { name: "Ridiculous stats" });
  await card.getByRole("button", { name: "Generate ridiculous stat" }).click();
  await card.getByRole("button", { name: "Show the receipts" }).click();
  await card.getByRole("button", { name: "Next", exact: true }).click();
  await expect(card.getByText("Opponent 11", { exact: true })).toBeVisible();
  const text = await card.innerText();
  const height = (await card.boundingBox())!.height;
  const initialBoxscoreCalls = boxscoreCalls;
  await page.clock.runFor(10_000);
  await expect.poll(() => boxscoreCalls).toBeGreaterThan(initialBoxscoreCalls);
  await expect(
    page.getByRole("tabpanel").getByText(String(385 + boxscoreCalls), { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(100);
  expect(insightCalls).toBe(1);
  expect(await card.innerText()).toBe(text);
  expect((await card.boundingBox())!.height).toBe(height);
  await expect(card.getByRole("button", { name: "Another ridiculous stat" })).toBeEnabled();
});

test("another insight keeps the previous snapshot visible while loading and after a failed request", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ridiculous-stats/**", async (route) => {
    calls++;
    if (calls === 2) {
      await gate;
      return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    }
    return route.fulfill({ json: response(game.id, calls === 1 ? 0 : 1) });
  });
  await page.goto("/");
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  const card = page.getByRole("region", { name: "Ridiculous stats" });
  await card.getByRole("button", { name: "Generate ridiculous stat" }).click();
  const another = card.getByRole("button", { name: "Another ridiculous stat" });
  await expect(another).toBeEnabled();
  const height = (await card.boundingBox())!.height;
  await another.click();
  await expect.poll(() => calls).toBe(2);
  await expect(another).toBeDisabled();
  await expect(card.getByText(/Seattle have 200 rushing/)).toBeVisible();
  await expect(card.getByText("Checking the history books…")).toHaveCount(0);
  expect((await card.boundingBox())!.height).toBe(height);
  release();
  await expect(card.getByText(/temporarily unavailable/)).toBeVisible();
  await expect(card.getByText(/Seattle have 200 rushing/)).toBeVisible();
  await card.getByRole("button", { name: "Try again" }).click();
  await expect(card.getByText(/Seattle recorded five field goals/)).toBeVisible();
});

test("a single-result game can fetch an updated snapshot on demand", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  let calls = 0;
  await page.route("**/api/ridiculous-stats/**", (route) => {
    calls++;
    const result = response();
    result.count = 1;
    result.fact!.text = calls === 1 ? "First snapshot." : "Updated snapshot.";
    return route.fulfill({ json: result });
  });
  await page.goto("/");
  await page.getByTestId(`live-dashboard-game-${game.id}`).click();
  const card = page.getByRole("region", { name: "Ridiculous stats" });
  await card.getByRole("button", { name: "Generate ridiculous stat" }).click();
  await expect(card.getByText("First snapshot.", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Another ridiculous stat" }).click();
  await expect(card.getByText("Updated snapshot.", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
});

for (const width of [390, 1194, 2560]) {
  test(`ridiculous stats and receipts fit a ${width}px viewport`, async ({
    page,
    seedUser: _seedUser,
    mockEspnApi: _mockEspnApi,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/schedule**", (route) =>
      route.fulfill({ json: mockPreseasonSchedule }),
    );
    await page.route("**/api/ridiculous-stats/**", (route) => route.fulfill({ json: response() }));
    await page.goto("/");
    if (width >= 1152) await page.getByTestId(`live-dashboard-game-${game.id}`).click();
    else
      await page
        .getByRole("button", { name: "View live updates for Seattle Seahawks at Tennessee Titans" })
        .click();
    const card = page.getByRole("region", { name: "Ridiculous stats" });
    await card.getByRole("button", { name: "Generate ridiculous stat" }).click();
    await card.getByRole("button", { name: "Show the receipts" }).click();
    await expect(card.getByRole("table")).toBeVisible();
    expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await card.screenshot({ path: testInfo.outputPath(`ridiculous-${width}.png`) });
  });
}
