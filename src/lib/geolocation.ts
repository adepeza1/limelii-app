import { Capacitor } from "@capacitor/core";

export type PermState = "granted" | "denied" | "prompt" | "unavailable";

export interface Coords {
  lat: number;
  lng: number;
}

const DEFAULTS = { timeout: 10_000, maximumAge: 300_000 };

/**
 * Use the native plugin ONLY when it's actually compiled into the running
 * binary. The web app is loaded remotely (capacitor server.url) inside the
 * native shell, so a freshly deployed web change can run inside an OLDER
 * native binary that doesn't yet bundle @capacitor/geolocation. In that case
 * isPluginAvailable() is false and we fall back to the WebView's
 * navigator.geolocation (which works in WKWebView too) — so deploying the web
 * app never breaks location for users on the currently-shipped app. The native
 * plugin path activates automatically once a new binary ships with the plugin.
 */
function useNativePlugin(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Geolocation");
}

/**
 * Read the current geolocation permission WITHOUT triggering a prompt.
 *
 * Native (with plugin): uses @capacitor/geolocation, which reflects the OS-level
 * permission that iOS/Android persist across launches.
 * Web / native-without-plugin: uses the Permissions API; returns "prompt" when
 * it can't be determined.
 */
export async function getLocationPermission(): Promise<PermState> {
  if (useNativePlugin()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const { location } = await Geolocation.checkPermissions();
      if (location === "granted") return "granted";
      if (location === "denied") return "denied";
      return "prompt"; // "prompt" | "prompt-with-rationale"
    } catch {
      return "unavailable";
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable";
  if (!navigator.permissions?.query) return "prompt"; // can't tell — assume not yet decided
  try {
    const res = await navigator.permissions.query({ name: "geolocation" });
    return res.state as PermState; // "granted" | "denied" | "prompt"
  } catch {
    return "prompt";
  }
}

/**
 * Get the current coordinates, prompting for permission if necessary.
 * Rejects on denial or error. Call this only from explicit user actions
 * (or after confirming permission is already "granted") so we never prompt
 * unsolicited on a passive page load.
 *
 * On native the OS persists the grant, so subsequent launches won't re-prompt.
 */
export async function getCurrentCoords(
  opts: { timeout?: number; maximumAge?: number } = {}
): Promise<Coords> {
  const o = { ...DEFAULTS, ...opts };

  if (useNativePlugin()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    let { location } = await Geolocation.checkPermissions();
    if (location !== "granted") {
      ({ location } = await Geolocation.requestPermissions());
    }
    if (location !== "granted") throw new Error("Location permission denied");
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: o.timeout,
      maximumAge: o.maximumAge,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  return new Promise<Coords>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: o.timeout, maximumAge: o.maximumAge }
    );
  });
}
