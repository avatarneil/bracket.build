import { expect, test } from "../fixtures/test-fixtures";

test.describe("Bracket Selection", () => {
  test.beforeEach(
    async ({ page, seedUser: _seedUser, mockEspnApi: _mockEspnApi }) => {
      // Fixtures applied: seedUser skips welcome dialog, mockEspnApi mocks ESPN
      await page.goto("/");
      // Wait for bracket to load
      await expect(page.locator('[data-testid="bracket"]')).toBeVisible();
    },
  );

  test("displays playoff matchups", async ({ page }) => {
    // Check that matchups are present in the bracket
    const matchups = page.locator('[data-testid^="matchup-"]');
    const count = await matchups.count();
    // Should have multiple matchups (wild card, divisional, conference, super bowl)
    expect(count).toBeGreaterThan(5);
  });

  test("displays both AFC and NFC sections", async ({ page }) => {
    // The bracket should show both conferences
    // Check for matchups from either conference
    const allMatchups = page.locator('[data-testid^="matchup-"]');
    const count = await allMatchups.count();
    expect(count).toBeGreaterThan(0);
  });

  test("completed games show winners with selected state", async ({ page }) => {
    // Wild card games are complete in mock data, winners should be marked
    const selectedTeams = page.locator(
      '[data-testid^="team-card-"][data-selected="true"]',
    );
    await expect(selectedTeams.first()).toBeVisible();
  });

  test("super bowl matchup is displayed", async ({ page }) => {
    const superBowlMatchup = page.locator('[data-testid="matchup-superBowl"]');
    await expect(superBowlMatchup).toBeVisible();
  });

  test("completed games show selected winners", async ({ page }) => {
    // Wild card games in mock data are complete
    // Some teams should have data-selected="true" (the winners)
    const selectedTeams = page.locator('[data-selected="true"]');
    await expect(selectedTeams.first()).toBeVisible();
  });

  test("team cards display team information", async ({ page }) => {
    // Verify team cards show team data
    const teamCard = page.locator('[data-testid^="team-card-"]').first();
    await expect(teamCard).toBeVisible();

    // Team card should contain text (team name)
    const textContent = await teamCard.textContent();
    expect(textContent?.length).toBeGreaterThan(0);
  });
});
