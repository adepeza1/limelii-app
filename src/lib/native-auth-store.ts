"use client";

// Native-only persistence for the Kinde refresh token.
//
// iOS WKWebView evicts cookies between sessions (confirmed via Mixpanel:
// hasKindeRefresh flips true→false on the same device with no logout),
// which signs users out. Cookies alone aren't durable on native. We
// mirror the refresh token into Capacitor Preferences (UserDefaults),
// which survives WebView resets, and rehydrate the session on launch.
//
// Every call is guarded so this is a no-op on web AND on older native
// binaries that don't bundle the Preferences plugin — those fall back to
// the existing cookie-only behavior with no error.

const KEY = "kinde_refresh_token";

function preferencesAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      isPluginAvailable?: (name: string) => boolean;
    };
  }).Capacitor;
  return !!cap?.isNativePlatform?.() && !!cap?.isPluginAvailable?.("Preferences");
}

export async function storeRefreshToken(token: string): Promise<void> {
  if (!preferencesAvailable()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: KEY, value: token });
  } catch {
    /* ignore — storage is best-effort */
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  if (!preferencesAvailable()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: KEY });
    return value ?? null;
  } catch {
    return null;
  }
}

export async function clearStoredRefreshToken(): Promise<void> {
  if (!preferencesAvailable()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: KEY });
  } catch {
    /* ignore */
  }
}
