"use client";

import { LoaderCircle } from "lucide-react";
import { useAccountSettings } from "@/contexts/AccountSettingsContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function AccountSettings() {
  const { settings, saving, error, notice, reload, setRidiculousStatsEnabled } =
    useAccountSettings();
  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-gray-400">
        Personalize your experience. Settings are saved to your account across devices.
      </p>
      <section
        aria-labelledby="game-insights-heading"
        className="rounded-xl border border-gray-800 bg-gray-950 p-5 sm:p-6"
      >
        <h2 id="game-insights-heading" className="mb-4 text-lg font-semibold">
          Game insights
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <label
              htmlFor="ridiculous-stats-enabled"
              className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 font-medium"
            >
              Ridiculous stats
              <span className="rounded border border-violet-400/40 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-200">
                BETA
              </span>
            </label>
            <p id="ridiculous-stats-description" className="text-sm leading-relaxed text-gray-400">
              Add a button to game stats that finds absurdly specific comparisons with real football
              history. Off by default.
            </p>
          </div>
          <div className="flex min-h-11 shrink-0 items-center">
            <Switch
              id="ridiculous-stats-enabled"
              name="ridiculousStatsEnabled"
              checked={settings?.ridiculousStatsEnabled ?? false}
              disabled={!settings || saving}
              onCheckedChange={(enabled) => void setRidiculousStatsEnabled(enabled)}
              aria-describedby="ridiculous-stats-description"
              className="relative touch-manipulation before:absolute before:-inset-y-3 before:-inset-x-1 motion-reduce:transition-none [&>span]:motion-reduce:transition-none"
            />
          </div>
        </div>
        <div role="status" aria-live="polite" className="mt-4 min-h-6 text-sm text-gray-300">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Saving settings…
            </span>
          ) : error ? (
            <>
              <p className="text-amber-200">{error}</p>
              {!settings && (
                <Button
                  variant="outline"
                  className="mt-3 min-h-11 touch-manipulation"
                  onClick={reload}
                >
                  Retry
                </Button>
              )}
            </>
          ) : !settings ? (
            "Loading settings…"
          ) : (
            (notice ?? (settings.ridiculousStatsEnabled ? "On" : "Off"))
          )}
        </div>
      </section>
    </div>
  );
}
