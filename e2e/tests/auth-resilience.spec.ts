import { expect, test } from "../fixtures/test-fixtures";

test("guest brackets load and save when the Clerk script is blocked", async ({
  page,
  seedUser: _seedUser,
  mockEspnApi: _mock,
}) => {
  let blocked = 0;
  await page.route(/\/clerk\.browser\.js(?:\?|$)/, (route) => {
    blocked++;
    return route.abort();
  });
  await page.goto("/");
  await expect(page.getByTestId("bracket")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("nfl-bracket:current") ?? "null")?.userName,
      ),
    )
    .toBe("Test User");
  await expect(page.getByText("Loading bracket…", { exact: true })).toHaveCount(0);
  await expect.poll(() => blocked).toBeGreaterThan(0);
});

test("late guest authentication does not reset welcome input", async ({
  page,
  clearLocalStorage: _clear,
  mockEspnApi: _mock,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/clerk\.browser\.js(?:\?|$)/, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("#name").fill("Keep my name");
    release();
    await page.waitForFunction(
      () => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded,
    );
    await expect(page.locator("#name")).toHaveValue("Keep my name");
    await page.getByRole("button", { name: /start building/i }).click();
    await expect(page.getByTestId("bracket")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("nfl-bracket:current") ?? "null")?.userName,
        ),
      )
      .toBe("Keep my name");
  } finally {
    release();
  }
});
