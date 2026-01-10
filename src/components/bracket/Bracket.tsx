"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useBracket } from "@/contexts/BracketContext";
import { cn } from "@/lib/utils";
import { ConferenceBracket } from "./ConferenceBracket";
import { SuperBowl } from "./SuperBowl";

interface BracketProps {
  showUserName?: boolean;
}

interface ScrollHintWrapperProps {
  children: React.ReactNode;
  conference: "AFC" | "NFC";
}

function ScrollHintWrapper({ children, conference }: ScrollHintWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(true);
  const [showScrollDownHint, setShowScrollDownHint] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const threshold = 10; // Small threshold to account for rounding

    const atLeftEdge = scrollLeft <= threshold;
    const atRightEdge = scrollLeft + clientWidth >= scrollWidth - threshold;

    setCanScrollLeft(scrollLeft > threshold);
    setCanScrollRight(!atRightEdge);

    // Show scroll down hint when user reaches the right edge for the first time
    if (atRightEdge && !atLeftEdge && !hasReachedEnd) {
      setHasReachedEnd(true);
      setShowScrollDownHint(true);
    }
  }, [hasReachedEnd]);

  const handleScroll = useCallback(() => {
    setShowHint(false);
    updateScrollState();
  }, [updateScrollState]);

  const scrollTo = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * 0.7; // Scroll 70% of visible width
    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  }, []);

  // Check initial scroll state
  useEffect(() => {
    updateScrollState();
    // Re-check on resize
    const handleResize = () => updateScrollState();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateScrollState]);

  // Auto-hide initial hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-hide scroll down hint after 3 seconds
  useEffect(() => {
    if (showScrollDownHint) {
      const timer = setTimeout(() => setShowScrollDownHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showScrollDownHint]);

  const hasScrollableContent =
    canScrollLeft ||
    canScrollRight ||
    (scrollRef.current &&
      scrollRef.current.scrollWidth > scrollRef.current.clientWidth);

  return (
    <div
      className="relative w-full max-w-[calc(100vw-24px)] md:max-w-[calc(100vw-48px)] lg:w-auto lg:max-w-none"
      data-conference={conference}
    >
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={() => setShowHint(false)}
        className="w-full overflow-x-auto lg:overflow-visible scrollbar-hide scroll-smooth touch-pan-x"
        style={{ touchAction: "pan-x pan-y" }}
      >
        {children}
      </div>

      {/* Left fade gradient (mobile/tablet only) */}
      {canScrollLeft && (
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-black via-black/60 to-transparent md:w-12 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Right fade gradient (mobile/tablet only) */}
      {canScrollRight && (
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-black via-black/60 to-transparent md:w-12 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Left scroll arrow (mobile/tablet only) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollTo("left")}
          className="absolute left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/30 active:scale-90 md:left-2 md:h-10 md:w-10 lg:hidden"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      )}

      {/* Right scroll arrow (mobile/tablet only) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollTo("right")}
          className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/30 active:scale-90 md:right-2 md:h-10 md:w-10 lg:hidden"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      )}

      {/* Initial swipe hint (phone only - hidden on tablets since they have more space) */}
      {showHint && hasScrollableContent && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white/80 shadow-lg backdrop-blur-sm md:hidden",
            "animate-pulse",
          )}
          aria-hidden="true"
        >
          <ChevronLeft className="h-3 w-3" />
          <span>Swipe to explore</span>
          <ChevronRight className="h-3 w-3 animate-bounce-x" />
        </div>
      )}

      {/* Scroll down hint (phone only - hidden on tablet) - shows when user reaches right edge */}
      {showScrollDownHint && (
        <button
          type="button"
          onClick={() => {
            // Find the correct target section based on current conference
            // Note: DOM order has Super Bowl between AFC and NFC, but CSS reorders on mobile
            let targetElement: HTMLElement | null = null;

            if (conference === "AFC") {
              // From AFC, scroll to NFC section
              targetElement = document.querySelector('[data-conference="NFC"]');
            } else {
              // From NFC, scroll to Super Bowl (the element with order-last)
              const currentSection =
                scrollRef.current?.closest("[data-conference]");
              const parent = currentSection?.parentElement;
              // Super Bowl is the div with order-last class
              targetElement = parent?.querySelector(
                ".order-last",
              ) as HTMLElement;
            }

            if (targetElement) {
              targetElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              setShowScrollDownHint(false);
            }
          }}
          className={cn(
            "absolute bottom-2 right-2 flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95 md:hidden",
            "animate-pulse",
          )}
        >
          <span>
            Scroll down for {conference === "AFC" ? "NFC" : "Super Bowl"}
          </span>
          <ChevronDown className="h-3 w-3 animate-bounce" />
        </button>
      )}
    </div>
  );
}

export const Bracket = forwardRef<HTMLDivElement, BracketProps>(
  function Bracket({ showUserName = true }, ref) {
    const { bracket } = useBracket();

    return (
      <div
        ref={ref}
        className="flex min-w-fit flex-col items-center gap-4 rounded-2xl bg-black p-3 sm:gap-6 sm:p-4 md:gap-8 md:p-8 lg:p-6"
      >
        {/* Header */}
        {showUserName && bracket.userName && (
          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-400 sm:text-lg md:text-xl">
              {bracket.userName}&apos;s Bracket
            </h2>
            {bracket.name && (
              <h3 className="text-xs text-gray-500 sm:text-sm md:text-base">
                {bracket.name}
              </h3>
            )}
          </div>
        )}

        {/* Main Bracket Layout
            Mobile (< md): Vertical stack (AFC, NFC, Super Bowl) - each bracket scrolls horizontally left-to-right
            Tablet (md): Vertical stack with more spacing and larger elements
            Desktop (lg+): Horizontal (AFC | Super Bowl | NFC) - traditional bracket layout meeting in middle
        */}
        <div className="flex w-full flex-col gap-4 sm:gap-6 md:gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-4 xl:gap-8">
          {/* AFC Bracket */}
          <ScrollHintWrapper conference="AFC">
            <ConferenceBracket conference="AFC" />
          </ScrollHintWrapper>

          {/* Super Bowl - Between conferences on desktop, after both on mobile */}
          <div className="order-last flex justify-center lg:order-none lg:self-center">
            <SuperBowl />
          </div>

          {/* NFC Bracket */}
          <ScrollHintWrapper conference="NFC">
            <ConferenceBracket conference="NFC" />
          </ScrollHintWrapper>
        </div>

        {/* Completion status - hidden on mobile since MobileActionBar shows it prominently */}
        {bracket.isComplete && (
          <div className="mt-2 hidden items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2 text-center text-sm font-bold uppercase tracking-wider text-white lg:flex">
            <Trophy className="h-4 w-4" />
            Bracket Complete
          </div>
        )}
      </div>
    );
  },
);
