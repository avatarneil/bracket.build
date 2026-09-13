import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign up | bracket.build" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Join bracket.build</h1>
      <SignUp />
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Back to games
      </Link>
    </main>
  );
}
