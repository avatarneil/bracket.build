"use client";

import { Download, FolderOpen, Loader2, Save, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useBracket } from "@/contexts/BracketContext";
import {
  downloadImage,
  generateBracketImage,
  shareImage,
} from "@/lib/image-generator";
import { cn } from "@/lib/utils";
import { LoadBracketDialog } from "./dialogs/LoadBracketDialog";
import { SaveBracketDialog } from "./dialogs/SaveBracketDialog";

function ActionButton({
  onClick,
  disabled,
  icon: Icon,
  label,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  variant?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col items-center gap-1 rounded-xl px-5 py-2.5 transition-all duration-150 md:gap-1.5 md:px-6 md:py-3",
        "active:scale-95",
        variant === "default" && [
          "text-white/60",
          "hover:bg-white/5 hover:text-white",
          "active:bg-white/10",
        ],
        variant === "primary" && [
          "bg-white text-black",
          "shadow-[0_0_20px_rgba(255,255,255,0.15)]",
          "hover:bg-white/90",
          "active:bg-white/80",
        ],
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 transition-transform duration-150 md:h-6 md:w-6",
          variant === "default" && "group-hover:scale-110",
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-wider md:text-xs">
        {label}
      </span>
    </button>
  );
}

export function MobileActionBar() {
  const { bracket } = useBracket();
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    setIsGenerating(true);
    try {
      const blob = await generateBracketImage(bracket, {
        userName: bracket.userName,
        bracketName: bracket.name,
      });
      return blob;
    } catch (err) {
      console.error("Failed to generate image:", err);
      toast.error("Failed to generate image");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveScreenshot = async () => {
    setIsSaving(true);
    const blob = await generateImage();
    if (blob) {
      const filename = `${bracket.userName.replace(/\s+/g, "-")}-bracket-${Date.now()}.png`;
      await downloadImage(blob, filename);
      toast.success("Bracket saved as image!");
    }
    setIsSaving(false);
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (blob) {
      const shared = await shareImage(
        blob,
        `${bracket.userName}'s Playoff Bracket`,
        "Check out my NFL playoff predictions on bracket.build!",
      );
      if (!shared) {
        const filename = `${bracket.userName.replace(/\s+/g, "-")}-bracket-${Date.now()}.png`;
        await downloadImage(blob, filename);
        toast.success("Image downloaded!");
      }
    }
  };

  // When bracket is complete, show celebratory completion state
  if (bracket.isComplete && bracket.superBowl?.winner) {
    const winner = bracket.superBowl.winner;
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 md:px-6 md:pb-4 lg:hidden safe-area-bottom">
          {/* Clean card with white border accent */}
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl md:mx-auto md:max-w-lg">
            {/* Main content */}
            <div className="flex items-center gap-4 p-4 md:gap-5 md:p-5">
              {/* Winner team logo */}
              <div
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl p-2 md:h-16 md:w-16"
                style={{ backgroundColor: winner.primaryColor }}
              >
                <img
                  src={winner.logoUrl}
                  alt={`${winner.city} ${winner.name}`}
                  className="h-10 w-10 object-contain md:h-12 md:w-12"
                />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 md:text-xs">
                  Champion
                </span>
                <p className="truncate text-lg font-black uppercase tracking-tight text-white md:text-xl">
                  {winner.city} {winner.name}
                </p>
                <p className="text-xs font-medium text-white/40 md:text-sm">
                  Super Bowl LX
                </p>
              </div>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                disabled={isGenerating}
                aria-label="Share bracket"
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white transition-all duration-150 hover:bg-white/90 active:scale-95 disabled:opacity-50 md:h-14 md:w-14"
              >
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-black md:h-6 md:w-6" />
                ) : (
                  <Share2 className="h-5 w-5 text-black md:h-6 md:w-6" />
                )}
              </button>
            </div>

            {/* Secondary actions */}
            <div className="flex border-t border-white/10">
              <button
                type="button"
                onClick={() => setSaveDialogOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider text-white/50 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10 md:py-4 md:text-sm"
              >
                <Save className="h-4 w-4 md:h-5 md:w-5" />
                Save Bracket
              </button>
              <div className="w-px bg-white/10" />
              <button
                type="button"
                onClick={() => setLoadDialogOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider text-white/50 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10 md:py-4 md:text-sm"
              >
                <FolderOpen className="h-4 w-4 md:h-5 md:w-5" />
                Load
              </button>
            </div>
          </div>
        </div>

        <LoadBracketDialog
          open={loadDialogOpen}
          onOpenChange={setLoadDialogOpen}
        />

        <SaveBracketDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
        />
      </>
    );
  }

  // Normal state: clean floating dock
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 md:pb-6 lg:hidden safe-area-bottom">
        {/* Dock */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black p-1.5 shadow-2xl md:gap-2 md:rounded-3xl md:p-2">
          <ActionButton
            onClick={() => setLoadDialogOpen(true)}
            icon={FolderOpen}
            label="Load"
          />

          {/* Divider */}
          <div className="mx-1 h-8 w-px bg-white/10 md:mx-1.5 md:h-10" />

          {/* Save - Primary action */}
          <ActionButton
            onClick={() => setSaveDialogOpen(true)}
            icon={Save}
            label="Save"
            variant="primary"
          />

          {/* Divider */}
          <div className="mx-1 h-8 w-px bg-white/10 md:mx-1.5 md:h-10" />

          {/* Share */}
          <ActionButton
            onClick={handleShare}
            disabled={isGenerating}
            icon={isGenerating ? Loader2 : Share2}
            label="Share"
          />
        </div>
      </div>

      <LoadBracketDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
      />

      <SaveBracketDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
      />
    </>
  );
}
