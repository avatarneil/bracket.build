"use client";

import { useAuth } from "@clerk/nextjs";
import { Bell, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { accountRequest } from "@/lib/account-client";
import {
  applicationServerKey,
  needsHomeScreen,
  PUSH_OWNER_KEY,
  pushRegistration,
  supportsPush,
} from "@/lib/notifications/browser";
import {
  followKey,
  type NotificationFollow,
  type NotificationPreferences,
  type NotificationSettingsResponse,
} from "@/lib/notifications/types";
import { FollowList, FollowPicker } from "./NotificationFollows";

function Toggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center font-medium">
          {label}
        </label>
        {description && (
          <p id={`${id}-help`} className="text-sm leading-relaxed text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex min-h-11 shrink-0 items-center">
        <Switch
          id={id}
          name={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-describedby={description ? `${id}-help` : undefined}
          className="relative touch-manipulation before:absolute before:-inset-y-3 before:-inset-x-1 motion-reduce:transition-none [&>span]:motion-reduce:transition-none"
        />
      </div>
    </div>
  );
}

export function NotificationSettings() {
  const { userId } = useAuth();
  return userId ? <NotificationSettingsForAccount key={userId} ownerId={userId} /> : null;
}

function NotificationSettingsForAccount({ ownerId }: { ownerId: string }) {
  const [settings, setSettings] = useState<NotificationSettingsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [unfollowed, setUnfollowed] = useState<NotificationFollow | null>(null);
  const [device, setDevice] = useState<
    "loading" | "unsupported" | "install" | "blocked" | "off" | "on"
  >("loading");
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    void accountRequest<NotificationSettingsResponse>(
      "/api/notifications",
      "GET",
      undefined,
      abort.signal,
      ownerId,
    )
      .then((value) => {
        if (!abort.signal.aborted) setSettings(value);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("Unable to load notification settings. Please retry.");
      });
    if (needsHomeScreen()) setDevice("install");
    else if (!supportsPush()) setDevice("unsupported");
    else if (Notification.permission === "denied") setDevice("blocked");
    else
      void pushRegistration()
        .then(async (registration) => {
          const subscription = await registration.pushManager.getSubscription();
          if (abort.signal.aborted) return;
          // Revoked devices stay revoked until explicitly enabled again.
          if (subscription && localStorage.getItem(PUSH_OWNER_KEY) === ownerId) {
            const status = await accountRequest<{ enabled: boolean }>(
              "/api/notifications/subscriptions/status",
              "POST",
              { endpoint: subscription.endpoint },
              abort.signal,
              ownerId,
            );
            if (!abort.signal.aborted) setDevice(status.enabled ? "on" : "off");
          } else setDevice("off");
        })
        .catch(() => {
          if (!abort.signal.aborted) {
            setDevice("off");
            setError("Unable to check this device. Try enabling notifications again.");
          }
        });
    return () => abort.abort();
  }, [ownerId, revision]);

  async function run(
    action: (signal: AbortSignal) => Promise<void>,
    success = "Notification settings saved.",
  ) {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action(signal);
      if (!signal.aborted) setMessage(success);
    } catch (reason) {
      if (!signal.aborted)
        setError(
          reason instanceof Error ? reason.message : "Your change wasn’t saved. Please retry.",
        );
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  const request = <T,>(path: string, method: string, body: unknown, signal: AbortSignal) =>
    accountRequest<T>(path, method, body, signal, ownerId);
  function update(patch: Partial<NotificationPreferences>) {
    void run(async (signal) => {
      const preferences = await request<NotificationPreferences>(
        "/api/notifications",
        "PATCH",
        patch,
        signal,
      );
      if (!signal.aborted) setSettings((value) => value && { ...value, preferences });
    });
  }
  function saveFollow(follow: NotificationFollow) {
    void run(async (signal) => {
      const saved = await request<NotificationFollow>(
        "/api/notifications/follows",
        "PUT",
        follow,
        signal,
      );
      if (!signal.aborted)
        setSettings(
          (value) =>
            value && {
              ...value,
              follows: [
                ...value.follows.filter((item) => followKey(item) !== followKey(saved)),
                saved,
              ],
            },
        );
      if (!signal.aborted && unfollowed && followKey(unfollowed) === followKey(saved))
        setUnfollowed(null);
    }, "Follow saved. Kickoff and major updates use the switches below.");
  }
  function removeFollow(follow: NotificationFollow) {
    void run(async (signal) => {
      await request("/api/notifications/follows", "DELETE", { key: followKey(follow) }, signal);
      if (!signal.aborted)
        setSettings(
          (value) =>
            value && {
              ...value,
              follows: value.follows.filter((item) => followKey(item) !== followKey(follow)),
            },
        );
      if (!signal.aborted) setUnfollowed(follow);
    }, "Follow removed. Use Undo unfollow to restore it.");
  }
  function enableDevice() {
    if (!settings?.publicKey || inFlight.current) return;
    // Call before any await: iOS requires permission directly from a user gesture.
    const permission = Notification.requestPermission();
    void run(async (signal) => {
      if ((await permission) !== "granted") {
        if (!signal.aborted) setDevice(Notification.permission === "denied" ? "blocked" : "off");
        throw new Error(
          "Notifications weren’t allowed. You can try again or change your browser’s notification settings.",
        );
      }
      if (signal.aborted) return;
      const registration = await pushRegistration();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && localStorage.getItem(PUSH_OWNER_KEY) !== ownerId) {
        await subscription.unsubscribe();
        subscription = null;
      }
      const key = applicationServerKey(settings.publicKey!);
      if (
        subscription &&
        new Uint8Array(
          subscription.options.applicationServerKey ?? new ArrayBuffer(0),
        ).toString() !== key.toString()
      ) {
        await subscription.unsubscribe();
        subscription = null;
      }
      const active =
        subscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      try {
        if (signal.aborted) {
          await active.unsubscribe();
          return;
        }
        await request("/api/notifications/subscriptions", "POST", active.toJSON(), signal);
        if (signal.aborted) {
          await active.unsubscribe();
          return;
        }
        localStorage.setItem(PUSH_OWNER_KEY, ownerId);
        setDevice("on");
      } catch (reason) {
        await active.unsubscribe();
        throw reason;
      }
    }, "This device is ready for notifications.");
  }
  function disableDevice(allDevices = false) {
    void run(
      async (signal) => {
        const registration =
          "serviceWorker" in navigator
            ? await navigator.serviceWorker.getRegistration("/")
            : undefined;
        const subscription = await registration?.pushManager?.getSubscription();
        if (allDevices || subscription)
          await request(
            "/api/notifications/subscriptions",
            "DELETE",
            allDevices ? { allDevices: true } : { endpoint: subscription!.endpoint },
            signal,
          );
        await subscription?.unsubscribe();
        localStorage.removeItem(PUSH_OWNER_KEY);
        if (!signal.aborted) setDevice(supportsPush() ? "off" : "unsupported");
      },
      allDevices ? "All notification devices removed." : "Notifications disabled on this device.",
    );
  }

  const preferences = settings?.preferences;
  return (
    <section
      aria-labelledby="notifications-heading"
      className="mt-6 space-y-6 rounded-xl border border-gray-800 bg-gray-950 p-5 sm:p-6"
    >
      <div>
        <h2
          id="notifications-heading"
          className="flex scroll-mt-4 items-center gap-2 text-lg font-semibold"
        >
          <Bell className="size-5" aria-hidden="true" /> Notifications
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Follow the games that matter to you, even with the app closed. Notifications are off until
          you opt in.
        </p>
      </div>
      {!settings ? (
        <div>
          <p>{error || "Loading notification settings…"}</p>
          {error && (
            <Button onClick={() => setRevision((value) => value + 1)} className="mt-3 min-h-11">
              Retry notifications
            </Button>
          )}
        </div>
      ) : (
        <>
          <Toggle
            id="notifications-enabled"
            label="Allow notifications"
            description="Pause all alerts across your devices without losing your follows."
            checked={preferences!.enabled}
            disabled={busy}
            onChange={(enabled) => update({ enabled })}
          />
          <div className="space-y-3 rounded-lg border border-gray-800 bg-black/40 p-4">
            <h3 className="font-medium">This device</h3>
            <p className="text-sm leading-relaxed text-gray-300">
              {device === "loading"
                ? "Checking notification support…"
                : device === "install"
                  ? "On iPhone or iPad (iOS 16.4+), use Share → Add to Home Screen, open bracket.build from that icon, then enable this device."
                  : device === "unsupported"
                    ? "This browser doesn’t support push notifications. Try a current version of Safari, Chrome, Edge, or Firefox over HTTPS."
                    : device === "blocked"
                      ? "Notifications are blocked. Allow them in your browser or device settings, then reload this page."
                      : device === "on"
                        ? "Notifications are enabled on this device."
                        : "Enable this browser or installed app to receive your selected alerts."}
            </p>
            {!settings.publicKey && (
              <p className="text-sm text-amber-200">
                Push delivery isn’t configured on this deployment yet. You can still save your
                preferences and follows.
              </p>
            )}
            {device === "on" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11 touch-manipulation"
                  disabled={busy}
                  onClick={() => disableDevice()}
                >
                  Disable this device
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11 touch-manipulation"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const registration = await pushRegistration();
                      await registration.showNotification("bracket.build notifications", {
                        body: "This device can display game alerts. Your follows and alert switches control what arrives next.",
                        icon: "/pwa-icon/192",
                        tag: "bracket-test",
                        data: { url: "/settings" },
                      });
                    }, "Test notification displayed.")
                  }
                >
                  Show test notification
                </Button>
              </div>
            ) : (
              device === "off" && (
                <Button
                  className="min-h-11 touch-manipulation"
                  disabled={busy || !settings.publicKey || !preferences!.enabled}
                  onClick={enableDevice}
                >
                  {busy && (
                    <LoaderCircle
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  )}
                  Enable this device
                </Button>
              )
            )}
            {!preferences!.enabled && (
              <p className="text-sm text-gray-400">
                Turn on Allow notifications to start receiving alerts.
              </p>
            )}
            <Button
              variant="link"
              className="min-h-11 max-w-full whitespace-normal px-0 text-gray-300 touch-manipulation"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Remove every notification device? You can enable them again individually.",
                  )
                )
                  disableDevice(true);
              }}
            >
              Remove all notification devices…
            </Button>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">For your followed games and teams</h3>
            <Toggle
              id="notification-gameStart"
              label="Game start"
              description="When the live feed confirms kickoff."
              checked={preferences!.gameStart}
              disabled={busy}
              onChange={(gameStart) => update({ gameStart })}
            />
            <Toggle
              id="notification-majorUpdates"
              label="Major game updates"
              description="Scoring updates, lead changes, ties, and final scores. Updates may combine plays between checks."
              checked={preferences!.majorUpdates}
              disabled={busy}
              onChange={(majorUpdates) => update({ majorUpdates })}
            />
          </div>
          <div className="space-y-4 border-t border-gray-800 pt-5">
            <h3 className="font-semibold">Discover games to watch</h3>
            <Toggle
              id="notification-recommendations"
              label="Recommended games"
              description="Up to 15 minutes before postseason games, top-25 matchups, or meetings between teams winning at least 60% after three games."
              checked={preferences!.recommendations}
              disabled={busy}
              onChange={(recommendations) => update({ recommendations })}
            />
            <Toggle
              id="notification-heatingUp"
              label="Games heating up"
              description="One alert per game when it’s within eight points in the fourth quarter, or goes to overtime."
              checked={preferences!.heatingUp}
              disabled={busy}
              onChange={(heatingUp) => update({ heatingUp })}
            />
            <fieldset className="space-y-1">
              <legend className="mb-1 text-sm text-gray-400">
                Discover games in these leagues (including teams you don’t follow)
              </legend>
              {(
                [
                  ["nfl", "NFL"],
                  ["collegeFootball", "College football"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name={field}
                    checked={preferences![field]}
                    disabled={busy}
                    onChange={(event) => update({ [field]: event.target.checked })}
                    className="size-5 touch-manipulation accent-yellow-300 focus-visible:outline-2"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>
          <div className="space-y-4 border-t border-gray-800 pt-5">
            <h3 className="font-semibold">Your follows</h3>
            <p className="text-sm text-gray-400">
              Follow one game, or a team for a specific season including its postseason. Add the
              team again for another season.
            </p>
            <FollowPicker disabled={busy} save={saveFollow} />
            {unfollowed && (
              <div
                aria-live="polite"
                className="flex flex-wrap items-center gap-2 text-sm text-gray-300"
              >
                <span className="min-w-0 break-words">Unfollowed {unfollowed.label}.</span>
                <Button
                  variant="outline"
                  className="min-h-11 touch-manipulation"
                  disabled={busy}
                  onClick={() => saveFollow(unfollowed)}
                >
                  Undo unfollow
                </Button>
              </div>
            )}
            {settings.follows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-700 p-4 text-sm text-gray-400">
                No follows yet. Choose a game or team below a schedule selection to get started.
              </p>
            ) : (
              <FollowList
                follows={settings.follows}
                disabled={busy}
                save={saveFollow}
                remove={removeFollow}
              />
            )}
          </div>
          <p className="text-xs leading-relaxed text-gray-400">
            Alerts depend on the live feed and your device’s delivery settings. Checks run about
            once a minute; notifications can be delayed. Push needs an internet connection.
          </p>
        </>
      )}
      <div aria-live="polite" className="min-h-6 text-sm text-gray-300">
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Saving notification settings…
          </span>
        ) : error ? (
          <p className="text-amber-200">{error}</p>
        ) : (
          message
        )}
      </div>
    </section>
  );
}
