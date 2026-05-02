"use client";

import { useEffect } from "react";

/**
 * Marks the document with a `capacitor` attribute when running inside the
 * native Capacitor WebView so platform-specific CSS (e.g. disabling the iOS
 * long-press image callout / Search Image menu) can target it without
 * affecting users on the regular web.
 */
export function CapacitorClassMarker() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (isNative) {
      document.documentElement.setAttribute("data-capacitor", "true");
    }
  }, []);
  return null;
}
