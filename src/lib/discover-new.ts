import type { Experience } from "@/app/page";

const SEVEN_DAYS_MS = 7 * 86400 * 1000;

// Single source of truth for "new" — the section filter and the card badge
// both call this so their definitions can't drift apart.
export function isNew(experience: Experience): boolean {
  if (experience.created_at == null) return false;
  return experience.created_at >= Date.now() - SEVEN_DAYS_MS;
}
