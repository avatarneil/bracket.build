"use client";

function formatSeason(seasonYear: number) {
  return `${seasonYear}–${String(seasonYear + 1).slice(-2)}`;
}

interface SeasonSelectorProps {
  seasonYear: number;
  availableSeasons: number[];
  onSelect: (seasonYear: number) => void;
}

export function SeasonSelector({ seasonYear, availableSeasons, onSelect }: SeasonSelectorProps) {
  return (
    <div className="shrink-0">
      <label htmlFor="nfl-season" className="sr-only">
        Season
      </label>
      <select
        id="nfl-season"
        name="season"
        value={seasonYear}
        onChange={(event) => onSelect(Number.parseInt(event.target.value, 10))}
        className="min-h-11 touch-manipulation rounded-lg border border-gray-700 bg-gray-900 px-2 text-base font-semibold tabular-nums text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {availableSeasons.map((year) => (
          <option key={year} value={year}>
            {formatSeason(year)}
          </option>
        ))}
      </select>
    </div>
  );
}
