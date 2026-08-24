import type { FieldPosition, SeededTeam } from "@/types";
import { cn } from "@/lib/utils";

interface LiveFieldPositionProps {
  fieldPosition: FieldPosition | null;
  homeTeam: SeededTeam;
  awayTeam: SeededTeam;
  lastPlay: string | null;
  layout?: "panel" | "mobile";
  status?: "ready" | "loading" | "unavailable";
}

function formatDown(down: number, distance: number, yardsToEndzone: number) {
  const ordinal = down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : "4th";
  return `${ordinal} & ${distance >= yardsToEndzone ? "Goal" : distance}`;
}

export function LiveFieldPosition({
  fieldPosition,
  homeTeam,
  awayTeam,
  lastPlay,
  layout = "panel",
  status = "ready",
}: LiveFieldPositionProps) {
  const possessionTeam = fieldPosition
    ? [homeTeam, awayTeam].find((team) => team.id === fieldPosition.possessionTeamId)
    : null;
  const possessionName = fieldPosition
    ? (possessionTeam?.name ?? fieldPosition.possessionTeamId)
    : null;
  const possessionId = fieldPosition
    ? (possessionTeam?.id ?? fieldPosition.possessionTeamId)
    : null;
  const lineOfScrimmage = fieldPosition
    ? Math.max(0, Math.min(100, 100 - fieldPosition.yardsToEndzone))
    : null;
  const firstDownLine =
    fieldPosition && lineOfScrimmage !== null
      ? Math.min(100, lineOfScrimmage + fieldPosition.distance)
      : null;
  const downAndDistance = fieldPosition
    ? formatDown(fieldPosition.down, fieldPosition.distance, fieldPosition.yardsToEndzone)
    : null;
  const emptyStateMessage =
    status === "loading"
      ? "Loading field position…"
      : status === "unavailable"
        ? "Field position is temporarily unavailable"
        : "Between drives · awaiting the next line of scrimmage";
  const fieldMessage =
    status === "loading"
      ? "Loading field position…"
      : status === "unavailable"
        ? "Field position is temporarily unavailable"
        : "Field position will update on the next drive";

  return (
    <section
      data-testid="live-field-position"
      className={cn(
        "border-b border-gray-700 px-4 py-4 md:px-6",
        layout === "mobile" && "flex h-[30dvh] min-h-[200px] max-h-[270px] flex-col",
      )}
    >
      <div
        className={cn(
          "mb-3 flex flex-wrap items-baseline justify-between gap-2",
          layout === "mobile" && "mb-2 shrink-0",
        )}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
            On the field
          </p>
          {fieldPosition ? (
            <p className="mt-1 text-sm font-semibold text-white">
              {possessionName} · {downAndDistance}
            </p>
          ) : (
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-gray-300">
              {emptyStateMessage}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-4 text-[11px] font-medium text-gray-300",
            layout === "mobile" && "gap-3 text-[10px]",
          )}
        >
          <span
            className="inline-flex items-center gap-1.5"
            aria-label="White line: line of scrimmage"
          >
            <span className="h-3 w-0.5 bg-white" aria-hidden="true" />
            {layout === "mobile" ? (
              <>
                <span className="sm:hidden">LOS</span>
                <span className="hidden sm:inline">Line of scrimmage</span>
              </>
            ) : (
              "Line of scrimmage"
            )}
          </span>
          <span className="inline-flex items-center gap-1.5" aria-label="Yellow line: first down">
            <span className="h-3 w-0.5 bg-yellow-300" aria-hidden="true" />
            <span>{layout === "mobile" ? "1st down" : "First down"}</span>
          </span>
        </div>
      </div>

      <div
        role="img"
        aria-label={
          fieldPosition
            ? `${possessionName} has the ball, ${downAndDistance}, ${fieldPosition.yardsToEndzone} yards from the end zone. The line of scrimmage is at the ${lineOfScrimmage} yard line and the first-down line is at the ${firstDownLine} yard line.`
            : fieldMessage
        }
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-white/70 bg-[#176b3a] shadow-[inset_0_0_30px_rgba(0,0,0,0.28)]",
          layout === "mobile" ? "min-h-0 flex-1" : "h-32",
        )}
      >
        <div className="absolute inset-y-0 left-0 w-[7%] border-r-2 border-white/70 bg-[#124f2e]" />
        <div className="absolute inset-y-0 right-0 w-[7%] border-l-2 border-white/70 bg-[#124f2e]" />
        {Array.from({ length: 9 }, (_, index) => (index + 1) * 10).map((yardLine) => (
          <div
            key={yardLine}
            className="absolute inset-y-0 border-l border-white/30"
            style={{ left: `${yardLine}%` }}
          >
            <span className="absolute left-1 top-2 font-mono text-[9px] text-white/60 tabular-nums">
              {yardLine <= 50 ? yardLine : 100 - yardLine}
            </span>
          </div>
        ))}
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/25" />

        {fieldPosition && lineOfScrimmage !== null && firstDownLine !== null && (
          <>
            <div
              className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ left: `${lineOfScrimmage}%` }}
            >
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Ball
              </span>
            </div>
            <div
              className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.8)]"
              style={{ left: `${firstDownLine}%` }}
            />

            <div
              className="absolute top-1/2 z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gray-950 text-[9px] font-black text-white shadow-lg"
              style={{ left: `${lineOfScrimmage}%` }}
              aria-hidden="true"
            >
              {possessionId}
            </div>
          </>
        )}

        {!fieldPosition && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 px-6 text-center text-xs font-semibold text-white/75">
            {fieldMessage}
          </div>
        )}
      </div>

      {lastPlay && (
        <p
          className={cn(
            "mt-3 text-xs leading-5 text-gray-400",
            layout === "mobile" ? "line-clamp-1 shrink-0" : "line-clamp-2",
          )}
        >
          {lastPlay}
        </p>
      )}
    </section>
  );
}
