import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountControls } from "@/components/AccountControls";

export default async function BracketsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/brackets");
  return (
    <>
      <a
        href="#account-content"
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
        <main id="account-content" className="mx-auto max-w-7xl">
          {children}
        </main>
      </div>
    </>
  );
}
