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
    <div className="mb-4 flex min-h-11 items-center justify-center gap-3 sm:mb-5">
      <label htmlFor="nfl-season" className="text-sm font-medium text-gray-400">
        Season
      </label>
      <select
        id="nfl-season"
        name="season"
        value={seasonYear}
        onChange={(event) => onSelect(Number.parseInt(event.target.value, 10))}
        className="min-h-11 rounded-lg border border-gray-700 bg-gray-900 px-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
