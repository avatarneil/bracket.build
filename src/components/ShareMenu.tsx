"use client";

import { Copy, Download, Loader2, Send, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBracket } from "@/contexts/BracketContext";
import {
  copyImageToClipboard,
  downloadImage,
  generateBracketImage,
  shareImage,
} from "@/lib/image-generator";

interface ShareMenuProps {
  bracketRef: React.RefObject<HTMLDivElement | null>;
}

export function ShareMenu({ bracketRef }: ShareMenuProps) {
  const { bracket } = useBracket();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    if (!bracketRef.current) {
      toast.error("Cannot generate image");
      return null;
    }

    setIsGenerating(true);
    try {
      const blob = await generateBracketImage(bracketRef.current, {
        userName: bracket.userName,
        bracketName: bracket.name,
      });
      return blob;
    } catch (err) {
      toast.error("Failed to generate image");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (blob) {
      const filename = `${bracket.userName.replace(/\s+/g, "-")}-bracket-${Date.now()}.png`;
      await downloadImage(blob, filename);
      toast.success("Image downloaded!");
    }
  };

  const handleCopy = async () => {
    const blob = await generateImage();
    if (blob) {
      try {
        await copyImageToClipboard(blob);
        toast.success("Image copied to clipboard!");
      } catch {
        toast.error("Failed to copy image");
      }
    }
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (blob) {
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
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="border-gray-700 bg-gray-800">
        <DropdownMenuItem
          onClick={handleDownload}
          className="cursor-pointer text-white focus:bg-gray-700 focus:text-white"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Image
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleCopy}
          className="cursor-pointer text-white focus:bg-gray-700 focus:text-white"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy to Clipboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleShare}
          className="cursor-pointer text-white focus:bg-gray-700 focus:text-white"
        >
          <Send className="mr-2 h-4 w-4" />
          Share...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
