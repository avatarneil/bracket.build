"use client";

import { cn, getContrastSafeColor } from "@/lib/utils";
import type { PlayerLeaders, PlayerStatLine } from "@/types";

interface PlayerLeadersCardProps {
  awayLeaders: PlayerLeaders;
  homeLeaders: PlayerLeaders;
  awayTeamName: string;
  homeTeamName: string;
  awayColor: string;
  homeColor: string;
}

interface LeaderRowProps {
  category: string;
  awayLeader: PlayerStatLine | null;
  homeLeader: PlayerStatLine | null;
  awayColor: string;
  homeColor: string;
}

function LeaderRow({
  category,
  awayLeader,
  homeLeader,
  awayColor,
  homeColor,
}: LeaderRowProps) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-3">
      <div className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {category}
      </div>

      <div className="flex items-stretch gap-3">
        {/* Away player */}
        <div className="flex-1 text-center">
          {awayLeader ? (
            <div className="space-y-1">
              {awayLeader.headshot && (
                <div
                  className="mx-auto h-10 w-10 overflow-hidden rounded-full border-2"
                  style={{ borderColor: awayColor }}
                >
                  <img
                    src={awayLeader.headshot}
                    alt={awayLeader.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="text-xs font-medium text-white truncate">
                {awayLeader.name}
              </div>
              <div className="text-[10px] text-gray-400">
                {awayLeader.position}
              </div>
              <div className="text-xs font-mono text-gray-300">
                {awayLeader.stats}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-600">—</div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-700" />

        {/* Home player */}
        <div className="flex-1 text-center">
          {homeLeader ? (
            <div className="space-y-1">
              {homeLeader.headshot && (
                <div
                  className="mx-auto h-10 w-10 overflow-hidden rounded-full border-2"
                  style={{ borderColor: homeColor }}
                >
                  <img
                    src={homeLeader.headshot}
                    alt={homeLeader.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="text-xs font-medium text-white truncate">
                {homeLeader.name}
              </div>
              <div className="text-[10px] text-gray-400">
                {homeLeader.position}
              </div>
              <div className="text-xs font-mono text-gray-300">
                {homeLeader.stats}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-600">—</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlayerLeadersCard({
  awayLeaders,
  homeLeaders,
  awayTeamName,
  homeTeamName,
  awayColor,
  homeColor,
}: PlayerLeadersCardProps) {
  return (
    <div className="space-y-3">
      {/* Team headers */}
      <div className="flex items-center justify-between px-3 text-xs font-medium">
        <span style={{ color: getContrastSafeColor(awayColor) }}>
          {awayTeamName}
        </span>
        <span style={{ color: getContrastSafeColor(homeColor) }}>
          {homeTeamName}
        </span>
      </div>

      <LeaderRow
        category="Passing"
        awayLeader={awayLeaders.passer}
        homeLeader={homeLeaders.passer}
        awayColor={awayColor}
        homeColor={homeColor}
      />

      <LeaderRow
        category="Rushing"
        awayLeader={awayLeaders.rusher}
        homeLeader={homeLeaders.rusher}
        awayColor={awayColor}
        homeColor={homeColor}
      />

      <LeaderRow
        category="Receiving"
        awayLeader={awayLeaders.receiver}
        homeLeader={homeLeaders.receiver}
        awayColor={awayColor}
        homeColor={homeColor}
      />
    </div>
  );
}
