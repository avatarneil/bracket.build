import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountLibrary } from "@/components/account/AccountLibrary";
export const metadata: Metadata = {
  title: "My brackets | bracket.build",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">My brackets</h1>
      <Suspense fallback={<p>Loading saved brackets…</p>}>
        <AccountLibrary />
      </Suspense>
    </>
  );
}
