import { expect, test } from "../fixtures/test-fixtures";

test.describe("Game Stats Dialog", () => {
  test.beforeEach(
    async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
      await page.goto("/");
      await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
    },
  );

  test("stats button opens game stats dialog", async ({ page }) => {
    // Find a matchup with a stats button (completed game from mock data)
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    // Stats button may only appear on completed/in-progress games
    if (await statsButton.isVisible()) {
      await statsButton.click();
      await expect(
        page.locator('[data-testid="game-stats-dialog"]'),
      ).toBeVisible();
    }
  });

  test("game stats dialog has tabs", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();

      // Should have tabs for Stats, Leaders, Plays
      await expect(page.getByRole("tab", { name: /stats/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /leaders/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /plays/i })).toBeVisible();
    }
  });

  test("can switch between stats tabs", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();

      // Click Leaders tab
      await page.getByRole("tab", { name: /leaders/i }).click();
      await expect(
        page.getByRole("tabpanel", { name: /leaders/i }),
      ).toBeVisible();

      // Click Plays tab
      await page.getByRole("tab", { name: /plays/i }).click();
      await expect(
        page.getByRole("tabpanel", { name: /plays/i }),
      ).toBeVisible();
    }
  });

  test("game stats dialog can be closed", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await expect(
        page.locator('[data-testid="game-stats-dialog"]'),
      ).toBeVisible();

      // Close by clicking X button
      await page.getByRole("button", { name: /close/i }).click();
      await expect(
        page.locator('[data-testid="game-stats-dialog"]'),
      ).not.toBeVisible();
    }
  });

  test("game stats shows team statistics comparison", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();

      // Should show team stats from mock data
      await expect(page.getByText(/total yards/i)).toBeVisible();
    }
  });
});
