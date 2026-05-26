"use client";

import { useEffect, useState } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { initMixpanel, identify, optInMixpanel, track } from "@/lib/mixpanel";

export function MixpanelProvider() {
  const { user } = useKindeAuth();
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    initMixpanel();

    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) {
      // Web: no ATT framework, opt in immediately.
      optInMixpanel();
      setOptedIn(true);
      return;
    }

    let cancelled = false;
    import("@capgo/capacitor-app-tracking-transparency")
      .then(async ({ AppTrackingTransparency }) => {
        const status = await AppTrackingTransparency.getStatus();
        let resolved = status.status;
        if (resolved === "notDetermined") {
          const result = await AppTrackingTransparency.requestPermission();
          resolved = result.status;
        }
        if (cancelled) return;
        if (resolved === "authorized") {
          optInMixpanel();
          setOptedIn(true);
        }
      })
      .catch(() => {
        // Plugin unavailable — leave Mixpanel opted out.
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!optedIn) return;
    if (user?.id) {
      identify(user.id, {
        $email: user.email ?? undefined,
        $name: [user.given_name, user.family_name].filter(Boolean).join(" ") || undefined,
      });
    }
  }, [optedIn, user?.id, user?.email, user?.given_name, user?.family_name]);

  useEffect(() => {
    if (!optedIn) return;
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    (async () => {
      // Snapshot which auth cookies the server can see at app open. This
      // is the data we need to confirm whether WKWebView is dropping
      // cookies between sessions: a user with hasKindeRefresh=false on
      // an App Opened event has lost their long-lived auth cookie.
      let cookieState: Record<string, boolean> = {};
      try {
        const res = await fetch("/api/auth/cookie-state", { cache: "no-store" });
        if (res.ok) cookieState = await res.json();
      } catch {
        // Network blip — fall through without cookie properties.
      }
      track("App Opened", {
        platform: isNative ? "native" : "web",
        entry_path: window.location.pathname,
        ...cookieState,
      });
    })();
  }, [optedIn]);

  return null;
}
