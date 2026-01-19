import { expect, test } from "../fixtures/test-fixtures";

test.describe("Momentum Tracker", () => {
  test.beforeEach(async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
  });

  test("momentum tab is visible in game stats dialog", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await expect(page.locator('[data-testid="game-stats-dialog"]')).toBeVisible();

      // Momentum tab should be present
      await expect(page.getByRole("tab", { name: /momentum/i })).toBeVisible();
    }
  });

  test("can switch to momentum tab", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();

      // Click Momentum tab
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Tab panel should be visible
      await expect(page.getByRole("tabpanel", { name: /momentum/i })).toBeVisible();
    }
  });

  test("momentum tab shows win probability section", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show win probability label (either in indicator or chart)
      await expect(page.getByText(/win probability/i).first()).toBeVisible();
    }
  });

  test("momentum tab shows win probability percentages", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show percentage values (from mock data: 85% home win probability)
      // The indicator shows both teams' percentages
      const tabPanel = page.getByRole("tabpanel", { name: /momentum/i });
      await expect(tabPanel.getByText(/85%/).first()).toBeVisible();
    }
  });

  test("momentum tab shows win probability over time section", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show the chart section header
      await expect(page.getByText(/win probability over time/i)).toBeVisible();
    }
  });

  test("momentum tab shows key moments section", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show key momentum shifts heading
      await expect(page.getByText(/key momentum shifts/i)).toBeVisible();
    }
  });

  test("key moments display play descriptions", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show play text from mock data key moments
      await expect(page.getByText(/G. Pickens 35 Yd pass/i)).toBeVisible();
    }
  });

  test("key moments show swing percentages", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show swing percentage values (e.g., +14%, +15%)
      // The mock data has swings of 14, 13, and 15
      await expect(page.getByText(/\+14%/)).toBeVisible();
    }
  });

  test("key moments show quarter and time", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show quarter markers (Q1, Q2, Q4 from mock data)
      await expect(page.getByText(/Q1 8:23/)).toBeVisible();
    }
  });

  test("win probability chart is rendered", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Chart should be rendered (recharts creates SVG elements)
      const chartArea = page.locator(".recharts-wrapper");
      await expect(chartArea).toBeVisible();

      // Chart should have an area element (the win probability line)
      const areaPath = page.locator(".recharts-area-area");
      await expect(areaPath).toBeVisible();
    }
  });

  test("momentum indicator bar is visible", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // The momentum indicator bar should be visible (has specific styling)
      // Look for the bar container with team colors
      const momentumBar = page.locator(".rounded-full.bg-gray-700").first();
      await expect(momentumBar).toBeVisible();
    }
  });

  test("chart shows team legend", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.getByRole("tab", { name: /momentum/i }).click();

      // Should show team names in the legend (Steelers and Chargers from mock data)
      await expect(page.getByText(/steelers/i)).toBeVisible();
      await expect(page.getByText(/chargers/i)).toBeVisible();
    }
  });
});

test.describe("Momentum Tab Keyboard Navigation", () => {
  test.beforeEach(async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
  });

  test("can navigate to momentum tab with keyboard", async ({ page }) => {
    const statsButton = page.locator('[data-testid^="stats-btn-"]').first();

    if (await statsButton.isVisible()) {
      await statsButton.click();
      await expect(page.locator('[data-testid="game-stats-dialog"]')).toBeVisible();

      // Focus on first tab
      await page.getByRole("tab", { name: /stats/i }).focus();

      // Navigate right to Momentum tab (Stats -> Leaders -> Plays -> Momentum)
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");

      // Momentum tab should be focused and selected
      const momentumTab = page.getByRole("tab", { name: /momentum/i });
      await expect(momentumTab).toBeFocused();
      await expect(momentumTab).toHaveAttribute("aria-selected", "true");
    }
  });
});
