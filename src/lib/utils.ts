import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate relative luminance of a hex color (0-1 scale)
 * Based on WCAG 2.0 formula
 */
function getLuminance(hex: string): number {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((x) => {
      const c = parseInt(x, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  if (!rgb) return 0;
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Lighten a hex color by a given amount (0-1)
 */
function lightenColor(hex: string, amount: number): string {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((x) => parseInt(x, 16));
  if (!rgb) return hex;

  const lightened = rgb.map((c) => Math.min(255, Math.round(c + (255 - c) * amount)));
  return `#${lightened.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Returns a color with sufficient contrast for display on dark backgrounds.
 * If the color is too dark (luminance < 0.15), it will be lightened.
 */
export function getContrastSafeColor(hex: string): string {
  const luminance = getLuminance(hex);
  // If color is too dark for our dark gray background, lighten it
  if (luminance < 0.15) {
    return lightenColor(hex, 0.5);
  }
  return hex;
}
