import { z } from "zod";
import type { ScheduleGame, SeasonPhase } from "@/types";

export const leagueSchema = z.enum(["nfl", "college-football"]);
export const notificationPreferencesSchema = z.strictObject({
  enabled: z.boolean(),
  gameStart: z.boolean(),
  majorUpdates: z.boolean(),
  recommendations: z.boolean(),
  heatingUp: z.boolean(),
  nfl: z.boolean(),
  collegeFootball: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  gameStart: true,
  majorUpdates: true,
  recommendations: false,
  heatingUp: false,
  nfl: true,
  collegeFootball: false,
};

export const followSchema = z.strictObject({
  league: leagueSchema,
  season: z.number().int().min(2000).max(2100),
  kind: z.enum(["game", "team"]),
  targetId: z.string().regex(/^[A-Za-z0-9-]{1,40}$/),
  label: z.string().trim().min(1).max(160),
  gameStart: z.boolean(),
  majorUpdates: z.boolean(),
});
export type NotificationFollow = z.infer<typeof followSchema>;
export function followKey(
  follow: Pick<NotificationFollow, "league" | "season" | "kind" | "targetId">,
) {
  return `${follow.league}:${follow.season}:${follow.kind}:${follow.targetId}`;
}

export type NotificationGame = ScheduleGame & {
  league: z.infer<typeof leagueSchema>;
  season: number;
  phase: SeasonPhase;
  week: number;
};
export type NotificationKind = "gameStart" | "majorUpdates" | "recommendations" | "heatingUp";
export type GameAlert = {
  id: string;
  kind: NotificationKind;
  league: NotificationGame["league"];
  season: number;
  gameId: string;
  teamIds: string[];
  title: string;
  body: string;
  url: string;
};
export type NotificationSettingsResponse = {
  preferences: NotificationPreferences;
  follows: NotificationFollow[];
  publicKey: string | null;
};
