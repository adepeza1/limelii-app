"use client";

import { useEffect, useRef } from "react";

// How long the app can be backgrounded before we proactively refresh the
// Xano token on foreground. Xano tokens appear to expire after ~1-2 hours,
// so we refresh after 45 minutes to stay safely ahead of that.
const REFRESH_AFTER_MS = 45 * 60 * 1000;

export function SessionRefresher() {
  const lastActiveRef = useRef<number>(Date.now());
  const refreshingRef = useRef(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function setup() {
      // Only run inside Capacitor (native app) — skip in browser/web
      const isCapacitor =
        typeof window !== "undefined" &&
        !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
          .Capacitor?.isNativePlatform?.();

      if (!isCapacitor) return;

      const { App } = await import("@capacitor/app");

      const listener = await App.addListener("appStateChange", async ({ isActive }) => {
        if (!isActive) {
          // App going to background — record the time
          lastActiveRef.current = Date.now();
          return;
        }

        // App coming to foreground — refresh if it's been a while
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed < REFRESH_AFTER_MS || refreshingRef.current) return;

        refreshingRef.current = true;
        try {
          const res = await fetch("/api/auth/xano-token", { method: "POST" });
          if (!res.ok) {
            // Kinde session is also gone — send through full re-auth
            const params = new URLSearchParams(window.location.search);
            const current = window.location.pathname + (params.toString() ? `?${params}` : "");
            window.location.href = `/auth/callback?redirect_to=${encodeURIComponent(current)}`;
          }
        } catch {
          // Network error — don't redirect, let the next API call handle it
        } finally {
          refreshingRef.current = false;
        }
      });

      cleanup = () => listener.remove();
    }

    setup();
    return () => cleanup?.();
  }, []);

  return null;
}
