import * as htmlToImage from "html-to-image";

export interface GenerateImageOptions {
  userName: string;
  bracketName: string;
}

/**
 * Convert an image URL to a data URI by fetching through our proxy
 */
async function imageToDataUri(url: string): Promise<string> {
  try {
    // Use our proxy to avoid CORS issues
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image to data URI:", url, error);
    // Return a transparent 1x1 pixel as fallback
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

/**
 * Replace all external image sources with data URIs to avoid CORS issues during capture
 * Returns a cleanup function to restore original sources
 */
async function replaceImagesWithDataUris(element: HTMLElement): Promise<() => void> {
  const restoreFunctions: (() => void)[] = [];
  
  // Find all img elements (including those inside Next.js Image components)
  const images = element.querySelectorAll("img");
  
  // Create a map of unique URLs to avoid fetching duplicates
  const urlToDataUri = new Map<string, string>();
  const urlsToFetch: string[] = [];
  
  for (const img of images) {
    const src = img.src;
    // Only process external ESPN CDN images
    if (src && src.includes("espncdn.com") && !urlToDataUri.has(src)) {
      urlsToFetch.push(src);
    }
  }
  
  // Fetch all unique images in parallel
  const dataUris = await Promise.all(urlsToFetch.map(imageToDataUri));
  urlsToFetch.forEach((url, index) => {
    urlToDataUri.set(url, dataUris[index]);
  });
  
  // Replace all image sources
  for (const img of images) {
    const originalSrc = img.src;
    const dataUri = urlToDataUri.get(originalSrc);
    if (dataUri) {
      // Also store the original srcset if any
      const originalSrcset = img.srcset;
      
      img.src = dataUri;
      img.srcset = ""; // Clear srcset to prevent Next.js Image from overriding
      img.removeAttribute("data-nimg"); // Remove Next.js image marker
      
      restoreFunctions.push(() => {
        img.src = originalSrc;
        if (originalSrcset) {
          img.srcset = originalSrcset;
        }
      });
    }
  }
  
  return () => {
    for (let i = restoreFunctions.length - 1; i >= 0; i--) {
      restoreFunctions[i]();
    }
  };
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
    const originalWidth = layoutContainer.style.width;
    
    layoutContainer.style.flexDirection = 'row';
    layoutContainer.style.alignItems = 'flex-start';
    layoutContainer.style.justifyContent = 'center';
    layoutContainer.style.gap = '2.5rem';
    layoutContainer.style.width = 'auto';
    
    restoreFunctions.push(() => {
      layoutContainer.style.flexDirection = originalFlexDirection;
      layoutContainer.style.alignItems = originalAlignItems;
      layoutContainer.style.justifyContent = originalJustifyContent;
      layoutContainer.style.gap = originalGap;
      layoutContainer.style.width = originalWidth;
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
  
  // Fix NFC bracket direction - should be row-reverse on desktop (mirrored from AFC)
  // The NFC bracket has lg:flex-row-reverse class which we need to apply
  const nfcBracketRounds = element.querySelectorAll('.lg\\:flex-row-reverse');
  for (const bracketRounds of nfcBracketRounds) {
    if (bracketRounds instanceof HTMLElement) {
      const originalFlexDirection = bracketRounds.style.flexDirection;
      bracketRounds.style.flexDirection = 'row-reverse';
      restoreFunctions.push(() => {
        bracketRounds.style.flexDirection = originalFlexDirection;
      });
    }
  }
  
  // Fix NFC conference header alignment (should be right-aligned on desktop)
  const nfcHeader = element.querySelector('.lg\\:self-end') as HTMLElement;
  if (nfcHeader) {
    const originalAlignSelf = nfcHeader.style.alignSelf;
    nfcHeader.style.alignSelf = 'flex-end';
    restoreFunctions.push(() => {
      nfcHeader.style.alignSelf = originalAlignSelf;
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
  
  // Fix scroll wrapper widths (remove w-full, set auto width, clear max-width)
  const scrollWrappers = element.querySelectorAll('.relative.w-full');
  for (const wrapper of scrollWrappers) {
    if (wrapper instanceof HTMLElement) {
      const originalWidth = wrapper.style.width;
      const originalMaxWidth = wrapper.style.maxWidth;
      wrapper.style.width = 'auto';
      wrapper.style.maxWidth = 'none';
      restoreFunctions.push(() => { 
        wrapper.style.width = originalWidth; 
        wrapper.style.maxWidth = originalMaxWidth;
      });
    }
  }
  
  // Fix scroll containers inside wrappers
  const scrollContainers = element.querySelectorAll('.overflow-x-auto');
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
  
  // Fix Super Bowl container - ensure proper width and spacing
  const superBowlInner = element.querySelector('.flex.flex-col.items-center.gap-3') as HTMLElement;
  if (superBowlInner) {
    const originalMinWidth = superBowlInner.style.minWidth;
    superBowlInner.style.minWidth = '220px';
    restoreFunctions.push(() => { superBowlInner.style.minWidth = originalMinWidth; });
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
  // Replace external images with data URIs to avoid CORS issues
  const restoreImages = await replaceImagesWithDataUris(element);
  
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
    restoreImages();
    throw captureError;
  }
  
  // Restore overflow after successful capture
  element.style.overflow = originalOverflow;
  for (const { el, original } of overflowElements) {
    el.style.overflow = original;
  }
  
  // Restore layout and images
  restoreLayout();
  restoreImages();

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
