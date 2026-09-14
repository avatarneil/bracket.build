import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountControls } from "@/components/AccountControls";
import { SharedBracket } from "@/components/account/SharedBracket";
export const metadata: Metadata = {
  title: "Shared playoff bracket | bracket.build",
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <>
      <a
        href="#shared-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-50 rounded bg-white p-3 text-black"
      >
        Skip to content
      </a>
      <div className="min-h-screen bg-black px-4 py-6 text-white sm:px-8">
        <header className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md text-xl font-bold focus-visible:outline-2"
          >
            bracket<span className="text-gray-400">.build</span>
          </Link>
          <AccountControls />
        </header>
        <main id="shared-content" className="mx-auto max-w-5xl">
          <Suspense fallback={<p>Loading shared bracket…</p>}>
            <SharedBracket token={(await params).token} />
          </Suspense>
        </main>
      </div>
    </>
  );
}
