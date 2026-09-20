"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccountControls({ compact = false }: { compact?: boolean }) {
  const buttonClassName = cn("min-h-11 touch-manipulation transition-colors", compact && "px-2");

  return (
    <nav
      aria-label="Account"
      className={cn(
        "flex min-h-11 items-center justify-center",
        compact ? "ml-auto gap-1" : "mt-4 gap-2",
      )}
    >
      <Show when="signed-out">
        <SignInButton>
          <Button variant="ghost" className={buttonClassName}>
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton>
          <Button className={buttonClassName}>Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Button asChild variant="ghost" className={buttonClassName}>
          <Link href="/brackets">My brackets</Link>
        </Button>
        <UserButton
          showName={!compact}
          appearance={{
            elements: {
              userButtonTrigger:
                "min-h-11 min-w-11 max-w-full touch-manipulation rounded-md px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              userButtonOuterIdentifier: "max-w-40 truncate text-white",
            },
          }}
        />
      </Show>
    </nav>
  );
}
