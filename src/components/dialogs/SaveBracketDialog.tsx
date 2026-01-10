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
  const { bracket, setBracketName } = useBracket();
  const [name, setName] = useState(bracket.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      // Create a new bracket with a new ID for saving as a new version
      const bracketToSave = {
        ...bracket,
        id: nanoid(),
        name: name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setBracketName(name.trim());
      saveBracket(bracketToSave);
      toast.success("Bracket saved!", {
        description: `"${name.trim()}" has been saved.`,
      });
      onOpenChange(false);
    } catch {
      toast.error("Failed to save bracket");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-700 bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Save className="h-5 w-5" />
            Save Bracket
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Save your current bracket to access it later. You can save multiple
            versions with different names.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bracket-name" className="text-gray-300">
              Bracket Name
            </Label>
            <Input
              id="bracket-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Bracket"
              className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
            <div className="text-xs text-gray-400">
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700"
          >
            {isSaving ? "Saving..." : "Save Bracket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
