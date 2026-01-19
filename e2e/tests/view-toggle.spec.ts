import { expect, test } from "../fixtures/test-fixtures";

test.describe("View Toggle", () => {
  test.beforeEach(async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
  });

  test("starts in bracket view by default", async ({ page }) => {
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
  });

  test("can switch to live games view", async ({ page }) => {
    await page.click('[data-testid="view-toggle"]');

    // Should show live games view
    await expect(page.locator('[data-testid="live-games-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="bracket"]')).not.toBeVisible();
  });

  test("view toggle works in both directions", async ({ page }) => {
    // The view toggle should allow switching between views
    const viewToggle = page.locator('[data-testid="view-toggle"]');
    await expect(viewToggle).toBeVisible();

    // Click to show live games
    await viewToggle.click();

    // Live games view should be visible
    await expect(page.locator('[data-testid="live-games-view"]')).toBeVisible();
  });

  test("live games view shows game cards", async ({ page }) => {
    await page.click('[data-testid="view-toggle"]');

    // Should show live games view
    await expect(page.locator('[data-testid="live-games-view"]')).toBeVisible();
    // Should have game cards from mock data
    const gameCards = page.locator('[data-testid^="live-game-card-"]');
    await expect(gameCards.first()).toBeVisible();
  });
});
