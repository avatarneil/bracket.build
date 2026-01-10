import * as htmlToImage from "html-to-image";

export interface GenerateImageOptions {
  userName: string;
  bracketName: string;
}

/**
 * Temporarily applies desktop/landscape layout styles to the bracket
 * Returns a cleanup function to restore original styles
 */
function forceDesktopLayout(element: HTMLElement): () => void {
  const restoreFunctions: (() => void)[] = [];
  
  // Hide the in-bracket header (we have our own in the exported image)
  const bracketHeader = element.querySelector('.text-center') as HTMLElement;
  if (bracketHeader && bracketHeader.querySelector('h2')) {
    const originalDisplay = bracketHeader.style.display;
    bracketHeader.style.display = 'none';
    restoreFunctions.push(() => { bracketHeader.style.display = originalDisplay; });
  }
  
  // Force the main layout container to be horizontal (desktop layout)
  // Find the flex container that has flex-col on mobile, flex-row on desktop
  const layoutContainer = element.querySelector('.flex.flex-col.lg\\:flex-row') as HTMLElement;
  if (layoutContainer) {
    const originalFlexDirection = layoutContainer.style.flexDirection;
    const originalAlignItems = layoutContainer.style.alignItems;
    const originalJustifyContent = layoutContainer.style.justifyContent;
    const originalGap = layoutContainer.style.gap;
    
    layoutContainer.style.flexDirection = 'row';
    layoutContainer.style.alignItems = 'flex-start';
    layoutContainer.style.justifyContent = 'center';
    layoutContainer.style.gap = '2rem';
    
    restoreFunctions.push(() => {
      layoutContainer.style.flexDirection = originalFlexDirection;
      layoutContainer.style.alignItems = originalAlignItems;
      layoutContainer.style.justifyContent = originalJustifyContent;
      layoutContainer.style.gap = originalGap;
    });
  }
  
  // Fix Super Bowl ordering (remove order-last, make it center)
  const superBowlContainer = element.querySelector('.order-last.lg\\:order-none') as HTMLElement;
  if (superBowlContainer) {
    const originalOrder = superBowlContainer.style.order;
    const originalAlignSelf = superBowlContainer.style.alignSelf;
    superBowlContainer.style.order = '0';
    superBowlContainer.style.alignSelf = 'center';
    restoreFunctions.push(() => {
      superBowlContainer.style.order = originalOrder;
      superBowlContainer.style.alignSelf = originalAlignSelf;
    });
  }
  
  // Hide mobile-only UI elements (scroll hints, gradients, arrows)
  const mobileOnlyElements = element.querySelectorAll('.lg\\:hidden');
  for (const el of mobileOnlyElements) {
    if (el instanceof HTMLElement) {
      const originalDisplay = el.style.display;
      el.style.display = 'none';
      restoreFunctions.push(() => { el.style.display = originalDisplay; });
    }
  }
  
  // Show desktop-only elements (like completion status)
  const desktopOnlyElements = element.querySelectorAll('.hidden.lg\\:flex');
  for (const el of desktopOnlyElements) {
    if (el instanceof HTMLElement) {
      const originalDisplay = el.style.display;
      el.style.display = 'flex';
      restoreFunctions.push(() => { el.style.display = originalDisplay; });
    }
  }
  
  // Fix scroll wrapper widths (remove w-full, set auto width)
  const scrollWrappers = element.querySelectorAll('.relative.w-full.lg\\:w-auto');
  for (const wrapper of scrollWrappers) {
    if (wrapper instanceof HTMLElement) {
      const originalWidth = wrapper.style.width;
      wrapper.style.width = 'auto';
      restoreFunctions.push(() => { wrapper.style.width = originalWidth; });
    }
  }
  
  // Fix scroll containers inside wrappers
  const scrollContainers = element.querySelectorAll('.overflow-x-auto.lg\\:overflow-visible');
  for (const container of scrollContainers) {
    if (container instanceof HTMLElement) {
      const originalOverflow = container.style.overflow;
      const originalWidth = container.style.width;
      container.style.overflow = 'visible';
      container.style.width = 'auto';
      restoreFunctions.push(() => {
        container.style.overflow = originalOverflow;
        container.style.width = originalWidth;
      });
    }
  }
  
  // Fix column widths - the bracket round columns need to be wider for export
  // These have classes like w-44, lg:w-36 - we need to override to a proper width
  const roundColumns = element.querySelectorAll('.flex-shrink-0.flex-col');
  for (const col of roundColumns) {
    if (col instanceof HTMLElement) {
      const originalWidth = col.style.width;
      const originalMinWidth = col.style.minWidth;
      col.style.width = '180px';
      col.style.minWidth = '180px';
      restoreFunctions.push(() => {
        col.style.width = originalWidth;
        col.style.minWidth = originalMinWidth;
      });
    }
  }
  
  // Fix team card sizes - force medium size for export (not small)
  // Cards have h-10 (sm), h-12 (md), h-14 (lg) - force h-12 (48px) minimum
  const teamCards = element.querySelectorAll('button.rounded-lg.border-2');
  for (const card of teamCards) {
    if (card instanceof HTMLElement) {
      const originalHeight = card.style.height;
      const originalPadding = card.style.padding;
      const originalMinWidth = card.style.minWidth;
      card.style.height = '48px';
      card.style.paddingLeft = '12px';
      card.style.paddingRight = '12px';
      card.style.minWidth = '160px';
      restoreFunctions.push(() => {
        card.style.height = originalHeight;
        card.style.padding = originalPadding;
        card.style.minWidth = originalMinWidth;
      });
    }
  }
  
  // Also fix empty/TBD cards
  const emptyCards = element.querySelectorAll('.border-dashed.border-gray-600');
  for (const card of emptyCards) {
    if (card instanceof HTMLElement) {
      const originalHeight = card.style.height;
      const originalMinWidth = card.style.minWidth;
      card.style.height = '48px';
      card.style.minWidth = '160px';
      restoreFunctions.push(() => {
        card.style.height = originalHeight;
        card.style.minWidth = originalMinWidth;
      });
    }
  }
  
  return () => {
    // Restore in reverse order
    for (let i = restoreFunctions.length - 1; i >= 0; i--) {
      restoreFunctions[i]();
    }
  };
}

export async function generateBracketImage(
  element: HTMLElement,
  options: GenerateImageOptions,
): Promise<Blob> {
  // Force desktop/landscape layout
  const restoreLayout = forceDesktopLayout(element);
  
  // Find all elements with overflow that might clip content and temporarily disable
  const overflowElements: { el: HTMLElement; original: string }[] = [];
  const scrollContainers = element.querySelectorAll('.overflow-x-auto, .overflow-hidden, [style*="overflow"]');
  for (const el of scrollContainers) {
    if (el instanceof HTMLElement) {
      overflowElements.push({ el, original: el.style.overflow });
      el.style.overflow = 'visible';
    }
  }
  // Also handle the main element
  const originalOverflow = element.style.overflow;
  element.style.overflow = 'visible';
  
  // Small delay to ensure layout reflow is complete
  await new Promise((resolve) => setTimeout(resolve, 150));
  
  // Get the full scroll dimensions (content may be wider than visible area)
  const fullWidth = Math.max(element.scrollWidth, element.offsetWidth);
  const fullHeight = Math.max(element.scrollHeight, element.offsetHeight);
  
  let canvas: HTMLCanvasElement;
  try {
    // Use html-to-image which has better CSS support
    canvas = await htmlToImage.toCanvas(element, {
      backgroundColor: "#000000", // Pure black for OLED
      pixelRatio: 2, // Higher resolution
      cacheBust: true, // Avoid cache issues
      width: fullWidth,
      height: fullHeight,
      fetchRequestInit: {
        mode: "cors",
        credentials: "omit",
      },
    });
  } catch (captureError) {
    // Restore everything before throwing
    element.style.overflow = originalOverflow;
    for (const { el, original } of overflowElements) {
      el.style.overflow = original;
    }
    restoreLayout();
    throw captureError;
  }
  
  // Restore overflow after successful capture
  element.style.overflow = originalOverflow;
  for (const { el, original } of overflowElements) {
    el.style.overflow = original;
  }
  
  // Restore layout
  restoreLayout();

  // Add header with user info
  const finalCanvas = document.createElement("canvas");
  const ctx = finalCanvas.getContext("2d")!;
  const headerHeight = 80;
  const padding = 40;

  finalCanvas.width = canvas.width + padding * 2;
  finalCanvas.height = canvas.height + headerHeight + padding * 2;

  // Background - pure black for OLED
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Header - subtle gradient bar with NFL colors
  const gradient = ctx.createLinearGradient(0, 0, finalCanvas.width, 0);
  gradient.addColorStop(0, "#DC2626"); // red-600
  gradient.addColorStop(0.5, "#1f1f1f"); // Dark center
  gradient.addColorStop(1, "#2563EB"); // blue-600
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, finalCanvas.width, headerHeight);

  // Header text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `${options.userName}'s NFL Playoff Bracket`,
    finalCanvas.width / 2,
    35,
  );

  ctx.font = "20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#A1A1AA"; // Muted gray
  ctx.fillText(options.bracketName, finalCanvas.width / 2, 62);

  // Draw the bracket
  ctx.drawImage(canvas, padding, headerHeight + padding);

  // Footer with branding
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.textAlign = "right";
  ctx.fillText(
    "NFL Playoff Bracket 2025-26",
    finalCanvas.width - padding,
    finalCanvas.height - 15,
  );

  return new Promise((resolve, reject) => {
    try {
      finalCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to generate image - toBlob returned null"));
          }
        },
        "image/png",
        1.0,
      );
    } catch (toBlobError) {
      reject(toBlobError);
    }
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
