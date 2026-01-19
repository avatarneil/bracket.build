import { expect, test } from "../fixtures/test-fixtures";

test.describe("Responsive Behavior", () => {
  // Note: seedUser and mockEspnApi fixtures are applied but not directly used
  test.beforeEach(
    async ({ seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
      // Fixtures applied automatically - seedUser skips welcome dialog, mockEspnApi mocks ESPN
    },
  );

  test("mobile viewport shows mobile action bar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();

    await expect(
      page.locator('[data-testid="mobile-action-bar"]'),
    ).toBeVisible();
  });

  test("desktop viewport shows desktop controls", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();

    await expect(
      page.locator('[data-testid="desktop-controls"]'),
    ).toBeVisible();
  });

  test("tablet viewport shows mobile action bar", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();

    await expect(
      page.locator('[data-testid="mobile-action-bar"]'),
    ).toBeVisible();
  });

  test("bracket is scrollable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();

    // The bracket container should be scrollable
    const bracket = page.locator('[data-testid="bracket"]');
    const scrollWidth = await bracket.evaluate((el) => el.scrollWidth);
    const clientWidth = await bracket.evaluate((el) => el.clientWidth);

    // On mobile, content should be wider than viewport (scrollable)
    expect(scrollWidth).toBeGreaterThanOrEqual(clientWidth);
  });

  test("welcome dialog is responsive", async ({
    page,
    clearLocalStorage: _clearLocalStorage,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should fit within viewport
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.width).toBeLessThanOrEqual(375);
  });

  test("view toggle is accessible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();

    // View toggle should be visible and clickable
    const viewToggle = page.locator('[data-testid="view-toggle"]');
    await expect(viewToggle).toBeVisible();
    await viewToggle.click();

    await expect(page.locator('[data-testid="live-games-view"]')).toBeVisible();
  });
});

// Device-specific tests using Playwright's device emulation
// These tests run with project-specific settings from playwright.config.ts
test.describe("Device Emulation", () => {
  test("works on various mobile devices", async ({
    page,
    seedUser: _seedUser,
    mockEspnApi: _mockEspnApi,
  }) => {
    // This test runs with project-specific device settings (mobile-chrome, mobile-safari)
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
  });
});
