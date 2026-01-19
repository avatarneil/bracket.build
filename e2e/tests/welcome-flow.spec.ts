import { expect, test } from "../fixtures/test-fixtures";

test.describe("Welcome Dialog Flow", () => {
  test.beforeEach(
    async ({
      page,
      clearLocalStorage: _clearLocalStorage,
      mockEspnApi: _mockEspnApi,
    }) => {
      // Fixtures applied: clearLocalStorage clears storage, mockEspnApi mocks ESPN
      await page.goto("/");
    },
  );

  test("shows welcome dialog on first visit", async ({ page }) => {
    await expect(page.getByRole("dialog")).toBeVisible();
    // Check for welcome dialog content
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
  });

  test("entering name dismisses dialog and loads bracket", async ({ page }) => {
    await page.locator("#name").fill("Test User");
    await page.getByRole("button", { name: /start/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
  });

  test("start button is disabled with empty name", async ({ page }) => {
    const submitButton = page.getByRole("button", { name: /start/i });
    await expect(submitButton).toBeDisabled();

    await page.locator("#name").fill("   "); // whitespace only
    await expect(submitButton).toBeDisabled();
  });

  test("guest mode skips name entry", async ({ page }) => {
    await page.getByRole("button", { name: /viewing/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
  });

  test("persists user name in localStorage", async ({ page }) => {
    await page.locator("#name").fill("Persistent User");
    await page.getByRole("button", { name: /start/i }).click();

    // Wait for bracket to load
    await expect(page.locator('[data-testid="bracket"]')).toBeVisible();

    // Verify user data was saved to localStorage
    const storedUser = await page.evaluate(() =>
      localStorage.getItem("nfl-bracket:user"),
    );
    expect(storedUser).toBeTruthy();
    expect(JSON.parse(storedUser || "{}").name).toBe("Persistent User");
  });

  test("trims whitespace from name", async ({ page }) => {
    await page.locator("#name").fill("  John Doe  ");
    await page.getByRole("button", { name: /start/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    // Name should be trimmed in storage
    const storedUser = await page.evaluate(() =>
      localStorage.getItem("nfl-bracket:user"),
    );
    expect(JSON.parse(storedUser || "{}").name).toBe("John Doe");
  });
});
