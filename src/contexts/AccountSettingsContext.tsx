"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { accountRequest } from "@/lib/account-client";
import type { AccountSettings } from "@/lib/account-settings";

type SettingsState = {
  ownerId: string | null;
  settings: AccountSettings | null;
  saving: boolean;
  error: string | null;
  notice: string | null;
};

const initialState: SettingsState = {
  ownerId: null,
  settings: null,
  saving: false,
  error: null,
  notice: null,
};

const AccountSettingsContext = createContext<
  | (SettingsState & {
      reload: () => void;
      setRidiculousStatsEnabled: (enabled: boolean) => Promise<void>;
    })
  | null
>(null);

export function AccountSettingsProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [state, setState] = useState(initialState);
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);
  // Unknown, signed-out, and newly switched accounts all start with no opt-in.
  const current = userId && state.ownerId === userId ? state : initialState;

  useEffect(() => {
    if (!userId) {
      setState(initialState);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setState({ ...initialState, ownerId: userId });
    accountRequest<AccountSettings>("/api/settings", "GET", undefined, controller.signal, userId)
      .then((settings) => {
        if (!controller.signal.aborted) setState({ ...initialState, ownerId: userId, settings });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            ...initialState,
            ownerId: userId,
            error: "Unable to load your settings. Please retry.",
          });
      });
    return () => controller.abort();
  }, [userId, revision]);

  async function setRidiculousStatsEnabled(enabled: boolean) {
    const controller = request.current;
    if (!userId || !current.settings || current.saving || !controller || controller.signal.aborted)
      return;
    setState((previous) => ({ ...previous, saving: true, error: null, notice: null }));
    try {
      const settings = await accountRequest<AccountSettings>(
        "/api/settings",
        "PATCH",
        { ridiculousStatsEnabled: enabled },
        controller.signal,
        userId,
      );
      if (!controller.signal.aborted)
        setState({ ...initialState, ownerId: userId, settings, notice: "Settings saved." });
    } catch {
      if (!controller.signal.aborted)
        setState((previous) => ({
          ...previous,
          saving: false,
          error: "Your change wasn’t saved. Please try the switch again.",
        }));
    }
  }

  return (
    <AccountSettingsContext.Provider
      value={{
        ...current,
        reload: () => setRevision((value) => value + 1),
        setRidiculousStatsEnabled,
      }}
    >
      {children}
    </AccountSettingsContext.Provider>
  );
}

export function useAccountSettings() {
  const context = useContext(AccountSettingsContext);
  if (!context) throw new Error("AccountSettingsProvider is required.");
  return context;
}
