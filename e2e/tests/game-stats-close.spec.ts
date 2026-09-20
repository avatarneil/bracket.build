import { expect, test } from "../fixtures/test-fixtures";
import { mockPreseasonSchedule } from "../fixtures/mock-data";

for (const width of [390, 834, 1152, 1194, 1210, 1440, 2560]) {
  test(`close control stays clear of team logos at ${width}px`, async ({
    page,
    seedUser: _seedUser,
    mockEspnApi: _mockEspnApi,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/schedule**", (route) =>
      route.fulfill({ json: mockPreseasonSchedule }),
    );
    await page.goto("/");
    if (width >= 1152) {
      await page.getByTestId("live-dashboard-game-401873297").click();
    } else {
      await page
        .getByRole("button", { name: "View live updates for Seattle Seahawks at Tennessee Titans" })
        .click();
    }
    const details = page.getByTestId(width >= 1152 ? "game-stats-panel" : "game-stats-dialog");
    const close = details.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeVisible();
    // Wait for the dialog entrance scale animation before measuring targets.
    await expect
      .poll(async () => (await close.boundingBox())?.width ?? 0)
      .toBeGreaterThanOrEqual(44);
    const buttonBox = await close.boundingBox();
    expect(buttonBox!.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    for (const name of ["Seahawks", "Titans"]) {
      const logo = details.getByRole("img", { name, exact: true });
      const logoBox = await logo.boundingBox();
      expect(logoBox!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height);
    }
    await close.focus();
    await page.keyboard.press("Enter");
    await expect(details).not.toBeVisible();
  });
}
