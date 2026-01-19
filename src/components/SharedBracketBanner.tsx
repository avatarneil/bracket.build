"use client";

import { Copy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SharedBracketBannerProps {
  ownerName: string;
  onStartOwn: () => void;
  onCopyEdit: () => void;
}

export function SharedBracketBanner({ ownerName, onStartOwn, onCopyEdit }: SharedBracketBannerProps) {
  const router = useRouter();

  const handleStartOwn = () => {
    // Clear URL params and navigate to clean state
    router.push("/");
    onStartOwn();
  };

  const handleCopyEdit = () => {
    // Clear URL params but keep the bracket state
    router.push("/");
    onCopyEdit();
  };

  return (
    <div className="mb-4 w-full max-w-2xl rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 sm:mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-sm text-blue-200 sm:text-left">
          You&apos;re viewing <span className="font-semibold text-white">{ownerName}&apos;s</span>{" "}
          bracket
        </p>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartOwn}
            className="border-gray-600 bg-gray-800 text-xs text-white hover:bg-gray-700"
          >
            <X className="mr-1.5 h-3 w-3" />
            Start Your Own
          </Button>
          <Button
            size="sm"
            onClick={handleCopyEdit}
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
          >
            <Copy className="mr-1.5 h-3 w-3" />
            Copy & Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
