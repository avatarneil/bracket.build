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
  const getSizeClasses = () => {
    const mobileClasses =
      mobile === "sm"
        ? "h-10 px-2"
        : mobile === "md"
          ? "h-12 px-3"
          : "h-14 px-4";
    const desktopClasses =
      desktop === "sm"
        ? "lg:h-10 lg:px-2"
        : desktop === "md"
          ? "lg:h-12 lg:px-3"
          : "lg:h-14 lg:px-4";
    return `${mobileClasses} ${desktopClasses}`;
  };

  // Helper for icon/logo sizes
  const getIconSizeClasses = () => {
    const mobileClasses =
      mobile === "sm" ? "h-6 w-6" : mobile === "md" ? "h-8 w-8" : "h-10 w-10";
    const desktopClasses =
      desktop === "sm"
        ? "lg:h-6 lg:w-6"
        : desktop === "md"
          ? "lg:h-8 lg:w-8"
          : "lg:h-10 lg:w-10";
    return `${mobileClasses} ${desktopClasses}`;
  };

  // Helper for seed badge sizes
  const getSeedBadgeClasses = () => {
    const mobileClasses =
      mobile === "lg" ? "h-6 w-6 text-sm" : "h-5 w-5 text-xs";
    const desktopClasses =
      desktop === "lg" ? "lg:h-6 lg:w-6 lg:text-sm" : "lg:h-5 lg:w-5 lg:text-xs";
    return `${mobileClasses} ${desktopClasses}`;
  };

  // Helper for text sizes
  const getCityTextClasses = () => {
    const mobileClasses =
      mobile === "sm" ? "text-xs" : mobile === "md" ? "text-sm" : "text-base";
    const desktopClasses =
      desktop === "sm"
        ? "lg:text-xs"
        : desktop === "md"
          ? "lg:text-sm"
          : "lg:text-base";
    return `${mobileClasses} ${desktopClasses}`;
  };

  const getTeamNameTextClasses = () => {
    const mobileClasses =
      mobile === "sm" ? "text-xs" : mobile === "md" ? "text-xs" : "text-sm";
    const desktopClasses =
      desktop === "sm"
        ? "lg:text-xs"
        : desktop === "md"
          ? "lg:text-xs"
          : "lg:text-sm";
    return `${mobileClasses} ${desktopClasses}`;
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

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border-2 transition-all duration-200",
        getSizeClasses(),
        // Winner state
        isWinner &&
          "border-yellow-500 bg-yellow-500/20 shadow-lg shadow-yellow-500/20",
        // Loser state
        isLoser && "border-gray-600 bg-gray-800/50 opacity-50",
        // Neutral state (clickable)
        !isWinner &&
          !isLoser &&
          !disabled &&
          "cursor-pointer border-gray-600 bg-gray-800 hover:border-gray-400 hover:bg-gray-700 active:scale-[0.98]",
        // Disabled state
        disabled &&
          !isLoser &&
          "cursor-not-allowed border-gray-700 bg-gray-800/50 opacity-70",
      )}
      style={{
        borderLeftColor: isWinner ? "#EAB308" : team.primaryColor,
        borderLeftWidth: "6px",
        boxShadow: isWinner
          ? "inset 4px 0 8px -2px rgba(234, 179, 8, 0.4)"
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
        <span className={cn("truncate text-gray-400", getTeamNameTextClasses())}>
          {team.city}
        </span>
      </div>

      {/* Winner Checkmark */}
      {isWinner && (
        <svg
          className="h-4 w-4 flex-shrink-0 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="Winner"
          role="img"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}
