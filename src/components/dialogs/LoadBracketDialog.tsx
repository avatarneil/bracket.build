"use client";

import { Calendar, FolderOpen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBracket } from "@/contexts/BracketContext";
import { deleteBracket, getCurrentBracket, getSavedBrackets } from "@/lib/storage";
import type { SavedBracket } from "@/types";

interface LoadBracketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoadBracketDialog({ open, onOpenChange }: LoadBracketDialogProps) {
  const { loadBracket, bracket: activeBracket } = useBracket();
  const [brackets, setBrackets] = useState<SavedBracket[]>([]);
  const [currentBracketId, setCurrentBracketId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const savedBrackets = getSavedBrackets();
      const currentBracket = getCurrentBracket();

      // Include the current (autosaved) bracket if it exists and isn't already in the saved list
      if (currentBracket && !savedBrackets.some((b) => b.id === currentBracket.id)) {
        const autosavedBracket: SavedBracket = {
          id: currentBracket.id,
          name: currentBracket.name || "Current Session",
          userName: currentBracket.userName,
          createdAt: currentBracket.createdAt,
          updatedAt: currentBracket.updatedAt,
          state: currentBracket,
        };
        setCurrentBracketId(currentBracket.id);
        // Put autosaved bracket first
        setBrackets([autosavedBracket, ...savedBrackets]);
      } else {
        setCurrentBracketId(currentBracket?.id || null);
        setBrackets(savedBrackets);
      }
    }
  }, [open]);

  const handleLoad = (saved: SavedBracket) => {
    loadBracket(saved.state);
    toast.success("Bracket loaded!", {
      description: `"${saved.name}" has been loaded.`,
    });
    onOpenChange(false);
  };

  const handleDelete = (id: string, name: string) => {
    deleteBracket(id);
    setBrackets(brackets.filter((b) => b.id !== id));
    toast.success("Bracket deleted", {
      description: `"${name}" has been deleted.`,
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-700 bg-gray-900 text-white sm:max-w-lg md:max-w-xl md:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white md:text-xl">
            <FolderOpen className="h-5 w-5 md:h-6 md:w-6" />
            Load Bracket
          </DialogTitle>
          <DialogDescription className="text-gray-400 md:text-base">
            Load a previously saved bracket.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto md:max-h-96 md:space-y-3">
          {brackets.length === 0 ? (
            <div className="py-8 text-center text-gray-500 md:py-12">
              <FolderOpen className="mx-auto mb-2 h-12 w-12 opacity-50 md:mb-4 md:h-16 md:w-16" />
              <p className="md:text-lg">No saved brackets yet.</p>
              <p className="text-sm md:text-base">Save your first bracket to see it here.</p>
            </div>
          ) : (
            brackets.map((saved) => {
              const isCurrent = saved.id === currentBracketId;
              const isActive = saved.id === activeBracket.id;
              return (
                <div
                  key={saved.id}
                  className={`flex items-center justify-between rounded-lg border p-3 md:p-4 ${
                    isCurrent
                      ? "border-blue-500/50 bg-blue-900/20"
                      : "border-gray-700 bg-gray-800/50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white md:text-lg">
                        {saved.name || "Untitled Bracket"}
                      </h4>
                      {isCurrent && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-400">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 md:text-sm">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                      {formatDate(saved.updatedAt)}
                    </div>
                    <div className="mt-1 text-xs md:text-sm">
                      {saved.state.isComplete ? (
                        <span className="text-green-400">Complete</span>
                      ) : (
                        <span className="text-yellow-400">In Progress</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-3">
                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(saved.id, saved.name)}
                        aria-label="Delete bracket"
                        className="border-red-600/50 bg-transparent text-red-400 hover:bg-red-600/20 hover:text-red-300 md:h-10 md:px-4"
                      >
                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleLoad(saved)}
                      disabled={isActive}
                      className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 disabled:opacity-50 md:h-10 md:px-5 md:text-base"
                    >
                      {isActive ? "Active" : "Load"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800 md:h-11 md:px-6 md:text-base"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
