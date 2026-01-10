"use client";

import { Save } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { toast } from "sonner";
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
import { saveBracket } from "@/lib/storage";

interface SaveBracketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveBracketDialog({
  open,
  onOpenChange,
}: SaveBracketDialogProps) {
  const { bracket, setBracketName, setSubtitle } = useBracket();
  const [name, setName] = useState(bracket.name);
  const [subtitle, setSubtitleValue] = useState(bracket.subtitle || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedSubtitle = subtitle.trim() || null;
      // Create a new bracket with a new ID for saving as a new version
      const bracketToSave = {
        ...bracket,
        id: nanoid(),
        name: trimmedName,
        subtitle: trimmedSubtitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setBracketName(trimmedName);
      setSubtitle(trimmedSubtitle);
      saveBracket(bracketToSave);
      toast.success("Bracket saved!", {
        description: trimmedName
          ? `"${trimmedName}" has been saved.`
          : "Your bracket has been saved.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save bracket");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-700 bg-gray-900 text-white sm:max-w-md md:max-w-lg md:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white md:text-xl">
            <Save className="h-5 w-5 md:h-6 md:w-6" />
            Save Bracket
          </DialogTitle>
          <DialogDescription className="text-gray-400 md:text-base">
            Save your current bracket to access it later. You can save multiple
            versions with different names.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2 md:space-y-3">
            <Label
              htmlFor="bracket-name"
              className="text-gray-300 md:text-base"
            >
              Bracket Name{" "}
              <span className="font-normal text-gray-500">(optional)</span>
            </Label>
            <Input
              id="bracket-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Dream Bracket"
              className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500 md:h-12 md:text-base"
            />
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label
              htmlFor="bracket-subtitle"
              className="text-gray-300 md:text-base"
            >
              Subtitle{" "}
              <span className="font-normal text-gray-500">(optional)</span>
            </Label>
            <Input
              id="bracket-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitleValue(e.target.value)}
              placeholder="e.g. Bold predictions for the playoffs"
              className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500 md:h-12 md:text-base"
            />
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 md:p-4">
            <div className="text-xs text-gray-400 md:text-sm">
              <p>
                <strong>Progress:</strong>{" "}
                {bracket.isComplete ? (
                  <span className="text-green-400">Complete</span>
                ) : (
                  <span className="text-yellow-400">In Progress</span>
                )}
              </p>
              <p>
                <strong>Owner:</strong> {bracket.userName}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="md:gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800 md:h-11 md:px-6 md:text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 md:h-11 md:px-6 md:text-base"
          >
            {isSaving ? "Saving..." : "Save Bracket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
