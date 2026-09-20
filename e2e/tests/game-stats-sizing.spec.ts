import { expect, test } from "../fixtures/test-fixtures";
import { mockPreseasonSchedule } from "../fixtures/mock-data";

test("keeps the game stats dialog the same size across Stats and Momentum", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mockEspnApi,
}) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.route("**/api/schedule**", (route) => route.fulfill({ json: mockPreseasonSchedule }));
  await page.goto("/");
  await page
    .getByRole("button", { name: "View live updates for Seattle Seahawks at Tennessee Titans" })
    .click();

  const dialog = page.getByTestId("game-stats-dialog");
  const statsPanel = dialog.getByRole("tabpanel", { name: "Stats" });
  await expect(statsPanel.getByText("Total Yards", { exact: true })).toBeVisible();
  // Measure the settled dialog, after its entrance scale animation.
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const statsDialogBox = await dialog.boundingBox();
  const statsPanelBox = await statsPanel.boundingBox();

  await dialog.getByRole("tab", { name: "Momentum" }).click();
  const momentumPanel = dialog.getByRole("tabpanel", { name: "Momentum" });
  await expect(momentumPanel.getByText("Win Probability Over Time", { exact: true })).toBeVisible();
  const momentumDialogBox = await dialog.boundingBox();
  const momentumPanelBox = await momentumPanel.boundingBox();

  expect(statsDialogBox).not.toBeNull();
  expect(statsPanelBox).not.toBeNull();
  expect(momentumDialogBox).not.toBeNull();
  expect(momentumPanelBox).not.toBeNull();
  expect(Math.abs(momentumDialogBox!.width - statsDialogBox!.width)).toBeLessThan(1);
  expect(Math.abs(momentumDialogBox!.height - statsDialogBox!.height)).toBeLessThan(1);
  expect(Math.abs(momentumPanelBox!.width - statsPanelBox!.width)).toBeLessThan(1);
  expect(statsPanelBox!.width).toBeGreaterThanOrEqual(statsDialogBox!.width - 2);
});
