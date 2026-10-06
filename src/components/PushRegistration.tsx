"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { PUSH_OWNER_KEY, pushRegistration } from "@/lib/notifications/browser";

export function PushRegistration() {
  const { isLoaded, userId } = useAuth();
  useEffect(() => {
    if (!isLoaded || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    void pushRegistration()
      .then(async (registration) => {
        if (cancelled || !("pushManager" in registration)) return;
        const owner = localStorage.getItem(PUSH_OWNER_KEY);
        if (owner && owner !== userId) {
          const subscription = await registration.pushManager.getSubscription();
          if (cancelled) return;
          await subscription?.unsubscribe();
          localStorage.removeItem(PUSH_OWNER_KEY);
        }
      })
      .catch(() => {
        /* Settings provides actionable setup errors. */
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);
  return null;
}
