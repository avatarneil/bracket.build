import { test as base, expect } from "@playwright/test";
import {
  mockGameBoxscore,
  mockWildCardResults,
  STORAGE_KEYS,
} from "./mock-data";

interface TestFixtures {
  // biome-ignore lint/suspicious/noConfusingVoidType: Playwright fixture pattern requires void for non-yielding fixtures
  mockEspnApi: void;
  // biome-ignore lint/suspicious/noConfusingVoidType: Playwright fixture pattern requires void for non-yielding fixtures
  clearLocalStorage: void;
  // biome-ignore lint/suspicious/noConfusingVoidType: Playwright fixture pattern requires void for non-yielding fixtures
  seedUser: void;
}

export const test = base.extend<TestFixtures>({
  // Mock all ESPN API endpoints
  mockEspnApi: async ({ page }, use) => {
    // Mock the standings endpoint
    await page.route("**/api/standings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockWildCardResults),
      });
    });

    // Mock the SSE stream to prevent real connections
    await page.route("**/api/standings/stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify(mockWildCardResults)}\n\n`,
      });
    });

    // Mock game stats endpoint
    await page.route("**/api/game-stats/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGameBoxscore),
      });
    });

    // Mock image proxy to avoid external requests
    await page.route("**/api/image-proxy**", async (route) => {
      // Return a transparent 1x1 PNG
      const transparentPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: transparentPng,
      });
    });

    await use();
  },

  // Clear localStorage before each test
  clearLocalStorage: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await use();
  },

  // Seed user to skip welcome dialog
  seedUser: async ({ page }, use) => {
    await page.addInitScript((keys) => {
      window.localStorage.setItem(
        keys.user,
        JSON.stringify({ name: "Test User" }),
      );
    }, STORAGE_KEYS);
    await use();
  },
});

export { expect };

// Helper to wait for bracket to load
export async function waitForBracketLoad(
  page: import("@playwright/test").Page,
) {
  await page.waitForSelector('[data-testid="bracket"]', { timeout: 10000 });
}

// Helper to select a team winner
export async function selectWinner(
  page: import("@playwright/test").Page,
  teamId: string,
) {
  await page.click(`[data-testid="team-card-${teamId}"]`);
}
