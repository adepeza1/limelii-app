import type { Experience } from "@/app/page";

// "New" window. Centralized so the section filter and the card badge
// can't drift apart.
const NEW_WINDOW_DAYS = 7;
const NEW_WINDOW_MS = NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Xano serializes timestamptz as milliseconds since epoch on this API,
// but be defensive: a 10-digit value is seconds, a 13-digit value is
// milliseconds. Anything else (including null/undefined) is treated as
// "we don't know — not new".
function toMillis(ts: number | undefined): number | null {
  if (ts == null || !Number.isFinite(ts)) return null;
  if (ts >= 1e12) return ts;
  if (ts >= 1e9) return ts * 1000;
  return null;
}

export function isNew(experience: Experience, now: number = Date.now()): boolean {
  const ms = toMillis(experience.created_at);
  if (ms === null) return false;
  return now - ms <= NEW_WINDOW_MS;
}

export function newestFirst(a: Experience, b: Experience): number {
  const aMs = toMillis(a.created_at) ?? 0;
  const bMs = toMillis(b.created_at) ?? 0;
  return bMs - aMs;
}
