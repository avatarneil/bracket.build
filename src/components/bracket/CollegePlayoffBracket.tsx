"use client";

import { useEffect, useState } from "react";
import {
  buildCollegeBracket,
  validCollegePicks,
  type CollegePicks,
  type CollegePlayoffTeam,
} from "@/lib/college-playoff";
import { cn } from "@/lib/utils";

export function CollegePlayoffBracket({
  seasonYear,
  teams,
}: {
  seasonYear: number;
  teams: CollegePlayoffTeam[] | null;
}) {
  const [picks, setPicks] = useState<CollegePicks>({});
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const storageKey = `bracket-build:college-football:${seasonYear}`;
  const fieldKey = teams?.map((team) => `${team.id}:${team.seed}`).join(",");
  useEffect(() => {
    if (!teams) return;
    try {
      setPicks(validCollegePicks(teams, JSON.parse(localStorage.getItem(storageKey) ?? "{}")));
    } catch {
      setPicks({});
    }
    setReady(true);
  }, [storageKey, fieldKey]);

  const games = teams ? buildCollegeBracket(teams, picks) : [];
  function save(next: CollegePicks) {
    if (!teams) return;
    const valid = validCollegePicks(teams, next);
    setPicks(valid);
    try {
      localStorage.setItem(storageKey, JSON.stringify(valid));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }

  return (
    <section
      aria-labelledby="cfp-title"
      className="my-4 w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-950 p-4"
      data-testid="college-playoff-bracket"
    >
      <h2 id="cfp-title" className="text-lg font-bold text-white">
        {seasonYear} College Football Playoff
      </h2>
      {games.length === 0 ? (
        <p className="mt-2 text-sm text-gray-300">
          Picks unlock when the complete 12-team CFP field is published. Bowl games are listed
          below.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-gray-300">
            Pick each winner to advance. Seeds 1–4 have a first-round bye. Picks save on this
            browser, separately from your NFL brackets.
          </p>
          {["First round", "Quarterfinals", "Semifinals", "National championship"].map((round) => (
            <div key={round} className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-300">{round}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {games
                  .filter((game) => game.round === round)
                  .map((game) => (
                    <div
                      key={game.id}
                      role="group"
                      aria-label={`${round} ${game.id}`}
                      className="min-w-0 rounded-lg border border-gray-700 p-1"
                    >
                      {game.teams.map((team, index) => (
                        <button
                          key={index}
                          type="button"
                          disabled={!ready || !game.teams.every(Boolean)}
                          aria-pressed={!!team && game.winner?.id === team.id}
                          onClick={() =>
                            team &&
                            save({
                              ...picks,
                              [game.id]: game.winner?.id === team.id ? "" : team.id,
                            })
                          }
                          className={cn(
                            "flex min-h-11 w-full touch-manipulation items-center gap-2 rounded px-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50",
                            game.winner?.id === team?.id && team
                              ? "bg-white font-semibold text-black"
                              : "text-gray-200 enabled:hover:bg-gray-800",
                          )}
                        >
                          {team ? (
                            <>
                              <span className="w-5 shrink-0 tabular-nums">{team.seed}</span>
                              <span className="min-w-0 break-words">{team.displayName}</span>
                              {game.winner?.id === team.id && (
                                <span aria-label="Picked winner">✓</span>
                              )}
                            </>
                          ) : (
                            "Pick the preceding winner"
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <p aria-live="polite" className="mt-3 text-sm text-gray-300">
            {saveError
              ? "Browser storage is unavailable. Keep this page open to retain your picks."
              : games.at(-1)?.winner
                ? `Your champion: ${games.at(-1)!.winner!.displayName}`
                : `${Object.keys(validCollegePicks(teams!, picks)).length} of 11 picks made`}
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 touch-manipulation rounded px-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            onClick={() => {
              if (window.confirm("Clear this season’s CFP picks?")) save({});
            }}
          >
            Reset CFP picks…
          </button>
        </>
      )}
    </section>
  );
}
