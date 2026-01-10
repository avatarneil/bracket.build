"use client";

import {
  ChevronDown,
  FolderOpen,
  Loader2,
  RotateCcw,
  Save,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBracket } from "@/contexts/BracketContext";
import {
  downloadImage,
  generateBracketImage,
  shareImage,
} from "@/lib/image-generator";
import { clearStoredUser } from "@/lib/storage";
import { LoadBracketDialog } from "./dialogs/LoadBracketDialog";
import { ShareMenu } from "./ShareMenu";

interface BracketControlsProps {
  bracketRef: React.RefObject<HTMLDivElement | null>;
  onResetName?: () => void;
}

export function BracketControls({
  bracketRef,
  onResetName,
}: BracketControlsProps) {
  const { bracket, resetBracket, setUserName } = useBracket();
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleResetBracket = () => {
    if (
      confirm(
        "Are you sure you want to reset your bracket? This cannot be undone.",
      )
    ) {
      resetBracket();
      toast.success("Bracket reset!");
    }
  };

  const handleResetName = () => {
    if (
      confirm("This will clear your name and reset your bracket. Continue?")
    ) {
      clearStoredUser();
      setUserName("");
      resetBracket();
      onResetName?.();
      toast.success("Name and bracket reset!");
    }
  };

  const handleSave = async () => {
    if (!bracketRef.current) {
      toast.error("Cannot generate image");
      return;
    }

    setIsSaving(true);
    try {
      const blob = await generateBracketImage(bracketRef.current, {
        userName: bracket.userName,
        bracketName: bracket.name,
      });

      const shared = await shareImage(
        blob,
        `${bracket.userName}'s Playoff Bracket`,
        "Check out my NFL playoff predictions on bracket.build!",
      );

      if (!shared) {
        // Fallback to download if share not supported
        const filename = `${bracket.userName.replace(/\s+/g, "-")}-bracket-${Date.now()}.png`;
        await downloadImage(blob, filename);
        toast.success("Image downloaded!");
      }
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Desktop controls - hidden on mobile since we have MobileActionBar */}
      <div className="hidden items-center justify-center gap-2 lg:flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800">
            <DropdownMenuItem
              onClick={handleResetBracket}
              className="cursor-pointer text-white focus:bg-gray-700 focus:text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Bracket
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              onClick={handleResetName}
              className="cursor-pointer text-white focus:bg-gray-700 focus:text-white"
            >
              <User className="mr-2 h-4 w-4" />
              Change Name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isSaving}
          className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>

        <Button
          variant="outline"
          onClick={() => setLoadDialogOpen(true)}
          className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Load
        </Button>

        <ShareMenu bracketRef={bracketRef} />
      </div>

      {/* Mobile/Tablet: Show reset dropdown at top - larger on tablets */}
      <div className="flex justify-center lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700 md:h-11 md:px-5 md:text-base"
            >
              <RotateCcw className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Reset
              <ChevronDown className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800 md:text-base">
            <DropdownMenuItem
              onClick={handleResetBracket}
              className="cursor-pointer text-white focus:bg-gray-700 focus:text-white md:py-3"
            >
              <RotateCcw className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Reset Bracket
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              onClick={handleResetName}
              className="cursor-pointer text-white focus:bg-gray-700 focus:text-white md:py-3"
            >
              <User className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Change Name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <LoadBracketDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
      />
    </>
  );
}
