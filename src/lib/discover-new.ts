import type { Experience } from "@/app/page";

const SEVEN_DAYS_MS = 7 * 86400 * 1000;

// Kill switch — flip to false to hide the section and badge if data
// quality regresses.
const NEW_FEATURE_ENABLED = true;

// Single source of truth for "new" — the section filter and the card badge
// both call this so their definitions can't drift apart.
export function isNew(experience: Experience): boolean {
  if (!NEW_FEATURE_ENABLED) return false;
  if (experience.created_at == null) return false;
  return experience.created_at >= Date.now() - SEVEN_DAYS_MS;
}
