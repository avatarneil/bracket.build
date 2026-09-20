import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/nextjs/server";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as base, expect } from "./test-fixtures";

export const test = base.extend<
  { signInAccount: () => Promise<void> },
  { testAccount: { email: string; userId: string } }
>({
  testAccount: [
    async ({ browserName: _browserName }, use) => {
      if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"))
        throw new Error("Authenticated browser tests require a Clerk development instance.");
      await clerkSetup();
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      // Clerk suppresses email delivery for +clerk_test addresses.
      const email = `bracket-e2e-${randomUUID()}+clerk_test@example.com`;
      const user = await client.users.createUser({
        emailAddress: [email],
        skipPasswordRequirement: true,
      });
      try {
        await use({ email, userId: user.id });
      } finally {
        await client.users.deleteUser(user.id);
      }
    },
    { scope: "worker" },
  ],
  signInAccount: async ({ page, testAccount }, use) => {
    await use(async () => {
      await page.goto("/");
      await clerk.signIn({ page, emailAddress: testAccount.email });
      await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
    });
  },
});

export { expect };
