import type { BracketState } from "@/types";

// Image size presets - smaller sizes render faster
export type ImageSize = "hd" | "fullhd" | "4k";

export interface GenerateImageOptions {
  userName: string;
  bracketName: string;
  /**
   * Image size preset:
   * - "hd" (1280x720) - fastest, good for web sharing
   * - "fullhd" (1920x1080) - default, balanced quality/speed
   * - "4k" (3840x2160) - highest quality, slower to generate
   */
  size?: ImageSize;
}

/**
 * Generate a bracket image by calling the server-side API
 * The server renders the bracket using Satori/ImageResponse
 */
export async function generateBracketImage(
  bracket: BracketState,
  options: GenerateImageOptions,
): Promise<Blob> {
  const response = await fetch("/api/generate-bracket-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bracket,
      userName: options.userName,
      bracketName: options.bracketName,
      size: options.size || "fullhd",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate image: ${response.status}`);
  }

  return response.blob();
}

export async function downloadImage(
  blob: Blob,
  filename: string,
): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyImageToClipboard(blob: Blob): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
  } catch (error) {
    throw new Error("Failed to copy image to clipboard");
  }
}

export async function shareImage(
  blob: Blob,
  title: string,
  text: string,
): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  const file = new File([blob], "bracket.png", { type: "image/png" });

  if (!navigator.canShare({ files: [file] })) {
    return false;
  }

  try {
    await navigator.share({
      title,
      text,
      files: [file],
    });
    return true;
  } catch (error) {
    // User cancelled or share failed
    return false;
  }
}
