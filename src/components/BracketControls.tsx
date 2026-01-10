"use client";

import { FolderOpen, Loader2, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBracket } from "@/contexts/BracketContext";
import {
  downloadImage,
  generateBracketImage,
  shareImage,
} from "@/lib/image-generator";
import { LoadBracketDialog } from "./dialogs/LoadBracketDialog";
import { ShareMenu } from "./ShareMenu";

interface BracketControlsProps {
  bracketRef: React.RefObject<HTMLDivElement | null>;
}

export function BracketControls({ bracketRef }: BracketControlsProps) {
  const { bracket, resetBracket } = useBracket();
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to reset your bracket? This cannot be undone.",
      )
    ) {
      resetBracket();
      toast.success("Bracket reset!");
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
        `${bracket.userName}'s NFL Playoff Bracket`,
        "Check out my NFL playoff predictions!",
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
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>

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

      {/* Mobile: Just show reset button at top */}
      <div className="flex justify-center lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Bracket
        </Button>
      </div>

      <LoadBracketDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
      />
    </>
  );
}
