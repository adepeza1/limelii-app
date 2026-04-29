"use client";

import { useEffect, useState } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { initMixpanel, identify, optInMixpanel } from "@/lib/mixpanel";

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
    import("@capacitor-community/app-tracking-transparency")
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

  return null;
}
