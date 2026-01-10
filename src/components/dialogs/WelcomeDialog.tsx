"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBracket } from "@/contexts/BracketContext";
import { setStoredUser } from "@/lib/storage";

interface WelcomeDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function WelcomeDialog({ open, onComplete }: WelcomeDialogProps) {
  const [name, setName] = useState("");
  const { setUserName } = useBracket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setStoredUser(name.trim());
      setUserName(name.trim());
      onComplete();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="border-gray-700 bg-gray-900 text-white sm:max-w-md md:max-w-lg md:p-8"
      >
        <DialogHeader className="items-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-blue-600 md:mb-4 md:h-20 md:w-20">
            <Trophy className="h-8 w-8 text-white md:h-10 md:w-10" />
          </div>
          <DialogTitle className="font-mono text-2xl tracking-tight text-white md:text-3xl">
            bracket.build
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400 md:text-base">
            Build your NFL playoff bracket and share your Super Bowl predictions
            with friends and family.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="name" className="text-gray-300 md:text-base">
              What&apos;s your name?
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500 md:h-12 md:text-base"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 md:h-12 md:text-base"
            >
              Start Building My Bracket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
