import html2canvas from "html2canvas";

export interface GenerateImageOptions {
  userName: string;
  bracketName: string;
}

// Detect if running on mobile
function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

// Wait for all images in an element to load
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const imagePromises: Promise<void>[] = [];

  for (const img of images) {
    if (!img.complete) {
      imagePromises.push(
        new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve even on error to not block
        }),
      );
    }
  }

  // Wait max 3 seconds for images
  await Promise.race([
    Promise.all(imagePromises),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

export async function generateBracketImage(
  element: HTMLElement,
  options: GenerateImageOptions,
): Promise<Blob> {
  // Wait for all images to load first
  await waitForImages(element);

  // Use lower scale on mobile to avoid memory issues
  const scale = isMobile() ? 1 : 2;

  const canvas = await html2canvas(element, {
    backgroundColor: "#111827", // gray-900
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    // Fix for Next.js Image components and cross-origin images
    onclone: (clonedDoc) => {
      // Convert all Next.js Image elements to regular img tags with inline styles
      const images = clonedDoc.querySelectorAll("img");
      for (const img of images) {
        // Remove Next.js specific attributes that can cause issues
        img.removeAttribute("loading");
        img.removeAttribute("decoding");
        img.removeAttribute("data-nimg");
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");

        // Ensure the image has explicit dimensions
        const rect = img.getBoundingClientRect();
        if (rect.width && rect.height) {
          img.style.width = `${rect.width}px`;
          img.style.height = `${rect.height}px`;
        }

        // Handle images that failed to load - replace with placeholder
        if (!img.complete || img.naturalHeight === 0) {
          img.style.backgroundColor = "#374151";
          img.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect fill='%23374151' width='32' height='32'/%3E%3C/svg%3E";
        }
      }
    },
  });

  // Add header with user info
  const finalCanvas = document.createElement("canvas");
  const ctx = finalCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }
  const headerHeight = 80;
  const padding = 40;

  finalCanvas.width = canvas.width + padding * 2;
  finalCanvas.height = canvas.height + headerHeight + padding * 2;

  // Background
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Header gradient
  const gradient = ctx.createLinearGradient(0, 0, finalCanvas.width, 0);
  gradient.addColorStop(0, "#DC2626"); // red-600
  gradient.addColorStop(1, "#2563EB"); // blue-600
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, finalCanvas.width, headerHeight);

  // Header text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `${options.userName}'s NFL Playoff Bracket`,
    finalCanvas.width / 2,
    35,
  );

  ctx.font = "20px system-ui, sans-serif";
  ctx.fillStyle = "#E5E7EB";
  ctx.fillText(options.bracketName, finalCanvas.width / 2, 62);

  // Draw the bracket
  ctx.drawImage(canvas, padding, headerHeight + padding);

  // Footer
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.textAlign = "right";
  ctx.fillText(
    "NFL Playoff Bracket 2025-26",
    finalCanvas.width - padding,
    finalCanvas.height - 15,
  );

  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to generate image"));
        }
      },
      "image/png",
      1.0,
    );
  });
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
  } catch {
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
  } catch {
    // User cancelled or share failed
    return false;
  }
}
