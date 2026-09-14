import { test, expect } from "../fixtures/test-fixtures";
import { createInitialBracket } from "../../src/lib/playoff-rules";
import { PLAYOFF_SEASON_YEAR } from "../../src/data/teams";

const token = "b705e8b6-73cf-43c4-a8cf-9fc4a567a92a";

test("guests can view a shared snapshot without editing it", async ({
  page,
  mockEspnApi: _mock,
}) => {
  const state = createInitialBracket("Public Fan");
  state.name = "Friends playoff picks";
  state.afc.wildCard[0].winner = state.afc.wildCard[0].homeTeam;
  await page.route(`**/api/shared-brackets/${token}`, (route) =>
    route.fulfill({
      json: { seasonYear: PLAYOFF_SEASON_YEAR, state, sharedAt: "2026-01-10T12:00:00Z" },
    }),
  );
  await page.goto(`/s/${token}`);
  await expect(page.getByRole("heading", { name: state.name })).toBeVisible();
  await expect(page.getByText("1 of 13 picks made")).toBeVisible();
  await expect(page.getByRole("link", { name: "Make my own bracket" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save bracket" })).toHaveCount(0);
  await expect(page.getByText("to compare your saved picks.")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("revoked shared links show a recovery path", async ({ page }) => {
  await page.route(`**/api/shared-brackets/${token}`, (route) =>
    route.fulfill({
      status: 404,
      json: { error: "This shared bracket is unavailable or its owner stopped sharing it." },
    }),
  );
  await page.goto(`/s/${token}`);
  await expect(page.getByRole("heading", { name: "Bracket unavailable" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to games" })).toBeVisible();
});
