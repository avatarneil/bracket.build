"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { SeededTeam } from "@/types";

type Size = "sm" | "md" | "lg";

interface TeamCardProps {
  team: SeededTeam | null;
  isWinner?: boolean;
  isLoser?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: Size;
  /** Size on mobile (< lg breakpoint). Takes precedence over size on mobile. */
  mobileSize?: Size;
  /** Size on desktop (>= lg breakpoint). Takes precedence over size on desktop. */
  desktopSize?: Size;
  /** Whether this matchup is locked with live results */
  isLocked?: boolean;
  /** Whether this team currently has possession (live games only) */
  hasPossession?: boolean;
  /** Whether this team is in the red zone */
  isRedZone?: boolean;
  /** Score to display on the right side of the card */
  score?: number | null;
  /** Color class for the score (e.g., "text-yellow-400" for live games) */
  scoreColorClass?: string;
}

export function TeamCard({
  team,
  isWinner = false,
  isLoser = false,
  onClick,
  disabled = false,
  size = "md",
  mobileSize,
  desktopSize,
  isLocked = false,
  hasPossession = false,
  isRedZone = false,
  score,
  scoreColorClass = "text-gray-400",
}: TeamCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    // Scroll the card into view on mobile for better UX
    if (buttonRef.current) {
      buttonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
    onClick?.();
  }, [onClick]);
  // Use responsive sizes if provided
  const mobile = mobileSize || size;
  const desktop = desktopSize || size;

  // Helper to generate responsive classes for height/padding
  // Includes tablet (md) sizing for better touch targets on iPad
  const getSizeClasses = () => {
    const mobileClasses =
      mobile === "sm"
        ? "h-10 px-2"
        : mobile === "md"
          ? "h-12 px-3"
          : "h-14 px-4";
    // Tablet gets slightly larger sizing for better touch targets
    const tabletClasses =
      mobile === "sm"
        ? "md:h-11 md:px-2.5"
        : mobile === "md"
          ? "md:h-14 md:px-4"
          : "md:h-16 md:px-5";
    const desktopClasses =
      desktop === "sm"
        ? "lg:h-10 lg:px-2"
        : desktop === "md"
          ? "lg:h-12 lg:px-3"
          : "lg:h-14 lg:px-4";
    return `${mobileClasses} ${tabletClasses} ${desktopClasses}`;
  };

  // Helper for icon/logo sizes
  const getIconSizeClasses = () => {
    const mobileClasses =
      mobile === "sm" ? "h-6 w-6" : mobile === "md" ? "h-8 w-8" : "h-10 w-10";
    // Tablet gets slightly larger icons
    const tabletClasses =
      mobile === "sm"
        ? "md:h-7 md:w-7"
        : mobile === "md"
          ? "md:h-9 md:w-9"
          : "md:h-11 md:w-11";
    const desktopClasses =
      desktop === "sm"
        ? "lg:h-6 lg:w-6"
        : desktop === "md"
          ? "lg:h-8 lg:w-8"
          : "lg:h-10 lg:w-10";
    return `${mobileClasses} ${tabletClasses} ${desktopClasses}`;
  };

  // Helper for seed badge sizes
  const getSeedBadgeClasses = () => {
    const mobileClasses =
      mobile === "lg" ? "h-6 w-6 text-sm" : "h-5 w-5 text-xs";
    // Tablet gets slightly larger badges
    const tabletClasses =
      mobile === "lg"
        ? "md:h-7 md:w-7 md:text-base"
        : "md:h-6 md:w-6 md:text-sm";
    const desktopClasses =
      desktop === "lg"
        ? "lg:h-6 lg:w-6 lg:text-sm"
        : "lg:h-5 lg:w-5 lg:text-xs";
    return `${mobileClasses} ${tabletClasses} ${desktopClasses}`;
  };

  // Helper for text sizes
  const getCityTextClasses = () => {
    const mobileClasses =
      mobile === "sm" ? "text-xs" : mobile === "md" ? "text-sm" : "text-base";
    // Tablet gets slightly larger text
    const tabletClasses =
      mobile === "sm"
        ? "md:text-sm"
        : mobile === "md"
          ? "md:text-base"
          : "md:text-lg";
    const desktopClasses =
      desktop === "sm"
        ? "lg:text-xs"
        : desktop === "md"
          ? "lg:text-sm"
          : "lg:text-base";
    return `${mobileClasses} ${tabletClasses} ${desktopClasses}`;
  };

  const getTeamNameTextClasses = () => {
    const mobileClasses =
      mobile === "sm" ? "text-xs" : mobile === "md" ? "text-xs" : "text-sm";
    // Tablet gets slightly larger text
    const tabletClasses =
      mobile === "sm"
        ? "md:text-xs"
        : mobile === "md"
          ? "md:text-sm"
          : "md:text-base";
    const desktopClasses =
      desktop === "sm"
        ? "lg:text-xs"
        : desktop === "md"
          ? "lg:text-xs"
          : "lg:text-sm";
    return `${mobileClasses} ${tabletClasses} ${desktopClasses}`;
  };

  if (!team) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/50",
          getSizeClasses(),
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded bg-gray-700",
            getIconSizeClasses(),
          )}
        >
          <span className="text-xs text-gray-500">?</span>
        </div>
        <span className="text-sm text-gray-500">TBD</span>
      </div>
    );
  }

  // Determine the glow color based on state
  const getPossessionGlow = () => {
    if (!hasPossession) return undefined;
    if (isRedZone) {
      return "0 0 20px 4px rgba(239, 68, 68, 0.6), 0 0 40px 8px rgba(239, 68, 68, 0.3)";
    }
    return `0 0 15px 3px ${team.primaryColor}80, 0 0 30px 6px ${team.primaryColor}40`;
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid={`team-card-${team.id}`}
      data-selected={isWinner || undefined}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-lg border-2 transition-all duration-200",
        getSizeClasses(),
        // Winner state - using pure gold for NFL championship feel
        isWinner &&
          "border-[#D4BE8C] bg-[#D4BE8C]/15 shadow-lg shadow-[#D4BE8C]/20",
        // Loser state
        isLoser && "border-gray-600 bg-gray-800/50 opacity-50",
        // Possession state - pulsing glow animation
        hasPossession && !isWinner && !isLoser && "animate-pulse-subtle",
        // Red zone possession
        hasPossession &&
          isRedZone &&
          !isWinner &&
          !isLoser &&
          "border-red-500/70",
        // Normal possession
        hasPossession &&
          !isRedZone &&
          !isWinner &&
          !isLoser &&
          "border-yellow-400/70",
        // Locked state (live results applied)
        isLocked &&
          !isWinner &&
          !isLoser &&
          !hasPossession &&
          "cursor-default border-green-700/50 bg-gray-800/70",
        // Neutral state (clickable)
        !isWinner &&
          !isLoser &&
          !disabled &&
          !isLocked &&
          !hasPossession &&
          "cursor-pointer border-gray-600 bg-gray-800 hover:border-gray-400 hover:bg-gray-700 active:scale-[0.98]",
        // Disabled state
        disabled &&
          !isLoser &&
          !isLocked &&
          "cursor-not-allowed border-gray-700 bg-gray-800/50 opacity-70",
      )}
      style={{
        borderLeftColor: isWinner
          ? "#D4BE8C"
          : hasPossession && isRedZone
            ? "#ef4444"
            : hasPossession
              ? "#facc15"
              : team.primaryColor,
        borderLeftWidth: "6px",
        boxShadow: isWinner
          ? "inset 4px 0 8px -2px rgba(255, 215, 0, 0.4)"
          : hasPossession
            ? getPossessionGlow()
            : `inset 4px 0 8px -2px ${team.primaryColor}40`,
      }}
    >
      {/* Team Logo */}
      <div
        className={cn(
          "relative flex-shrink-0 overflow-hidden rounded bg-white",
          getIconSizeClasses(),
        )}
      >
        <Image
          src={team.logoUrl}
          alt={`${team.city} ${team.name} logo`}
          fill
          className="object-contain p-0.5"
          sizes="(min-width: 1024px) 32px, 40px"
        />
      </div>

      {/* Seed Badge */}
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white",
          getSeedBadgeClasses(),
        )}
        style={{ backgroundColor: team.primaryColor }}
      >
        {team.seed}
      </div>

      {/* Team Info - Team name is primary (shorter, more recognizable) */}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <span
          className={cn(
            "truncate font-semibold text-white",
            getCityTextClasses(),
          )}
        >
          {team.name}
        </span>
        <span
          className={cn("truncate text-gray-400", getTeamNameTextClasses())}
        >
          {team.city}
        </span>
      </div>

      {/* Score display */}
      {score !== undefined && score !== null && (
        <div className="ml-1 flex-shrink-0 rounded bg-gray-900/80 px-1.5 py-0.5 md:px-2">
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums md:text-base",
              scoreColorClass,
            )}
          >
            {score}
          </span>
        </div>
      )}

      {/* Winner Checkmark - positioned in top-right corner */}
      {isWinner && (
        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4BE8C] shadow-md shadow-black/30 lg:h-5 lg:w-5">
          <svg
            className="h-3 w-3 lg:h-3 lg:w-3"
            viewBox="0 0 20 20"
            aria-label="Winner"
            role="img"
          >
            <path
              fill="#0f172a"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            />
          </svg>
        </div>
      )}

      {/* Possession indicator - football icon with glow */}
      {hasPossession && !isWinner && (
        <div
          className={cn(
            "absolute -left-3 top-1/2 -translate-y-1/2 flex items-center justify-center",
            "animate-bounce-subtle",
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full shadow-lg",
              isRedZone
                ? "bg-red-500 shadow-red-500/50"
                : "bg-yellow-400 shadow-yellow-400/50",
            )}
          >
            <span className="text-sm" role="img" aria-label="Has possession">
              🏈
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
