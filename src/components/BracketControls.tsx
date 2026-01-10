"use client";

import { FolderOpen, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBracket } from "@/contexts/BracketContext";
import { LoadBracketDialog } from "./dialogs/LoadBracketDialog";
import { SaveBracketDialog } from "./dialogs/SaveBracketDialog";
import { ShareMenu } from "./ShareMenu";

interface BracketControlsProps {
  bracketRef: React.RefObject<HTMLDivElement | null>;
}

export function BracketControls({ bracketRef }: BracketControlsProps) {
  const { resetBracket } = useBracket();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

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
          onClick={() => setSaveDialogOpen(true)}
          className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
        >
          <Save className="mr-2 h-4 w-4" />
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

      <SaveBracketDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
      />
      <LoadBracketDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
      />
    </>
  );
}
