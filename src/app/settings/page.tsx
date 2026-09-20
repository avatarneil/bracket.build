import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountControls } from "@/components/AccountControls";
import { AccountSettings } from "@/components/account/AccountSettings";

export const metadata: Metadata = {
  title: "Settings | bracket.build",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/settings");
  return (
    <>
      <a
        href="#settings-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-50 rounded bg-white p-3 text-black"
      >
        Skip to content
      </a>
      <div className="min-h-screen bg-black px-4 py-6 text-white sm:px-8">
        <header className="mx-auto mb-8 flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md text-xl font-bold focus-visible:outline-2"
          >
            bracket<span className="text-gray-400">.build</span>
          </Link>
          <AccountControls />
        </header>
        <main id="settings-content" className="mx-auto max-w-7xl">
          <h1 className="mb-6 scroll-mt-4 text-3xl font-bold">Settings</h1>
          <AccountSettings />
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 touch-manipulation items-center rounded text-sm text-gray-300 underline underline-offset-4 hover:text-white focus-visible:outline-2"
          >
            Back to games
          </Link>
        </main>
      </div>
    </>
  );
}
