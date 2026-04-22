import mixpanel from "mixpanel-browser";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let initialized = false;

export function initMixpanel() {
  if (initialized || !TOKEN || typeof window === "undefined") return;
  mixpanel.init(TOKEN, { persistence: "localStorage", ignore_dnt: false });
  initialized = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized || !TOKEN) return;
  mixpanel.track(event, props);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!initialized || !TOKEN) return;
  mixpanel.identify(userId);
  if (traits) mixpanel.people.set(traits);
}

export function reset() {
  if (!initialized || !TOKEN) return;
  mixpanel.reset();
}
