"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AccountControls() {
  return (
    <nav aria-label="Account" className="mt-4 flex min-h-11 items-center justify-center gap-2">
      <Show when="signed-out">
        <SignInButton>
          <Button variant="ghost" className="min-h-11 touch-manipulation transition-colors">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton>
          <Button className="min-h-11 touch-manipulation transition-colors">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          showName
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
