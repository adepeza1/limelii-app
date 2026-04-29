import mixpanel from "mixpanel-browser";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let initialized = false;
let trackingOptedIn = false;

export function initMixpanel() {
  if (initialized || typeof window === "undefined") return;
  if (!TOKEN) {
    console.warn("[Mixpanel] NEXT_PUBLIC_MIXPANEL_TOKEN is not set");
    return;
  }
  mixpanel.init(TOKEN, {
    persistence: "localStorage",
    ignore_dnt: false,
    opt_out_tracking_by_default: true,
  });
  initialized = true;
}

export function optInMixpanel() {
  if (!initialized || !TOKEN) return;
  if (trackingOptedIn) return;
  mixpanel.opt_in_tracking();
  trackingOptedIn = true;
}

export function optOutMixpanel() {
  if (!initialized || !TOKEN) return;
  mixpanel.opt_out_tracking();
  trackingOptedIn = false;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized || !TOKEN || !trackingOptedIn) return;
  mixpanel.track(event, props);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!initialized || !TOKEN || !trackingOptedIn) return;
  mixpanel.identify(userId);
  if (traits) mixpanel.people.set(traits);
}

export function reset() {
  if (!initialized || !TOKEN) return;
  mixpanel.reset();
}
