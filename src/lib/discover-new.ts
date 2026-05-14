import type { Experience } from "@/app/page";

const SEVEN_DAYS_MS = 7 * 86400 * 1000;

// Kill switch — set true to re-enable. Currently OFF because newly
// uploaded experiences point at fake place #314 and have missing
// neighborhood data; surfacing them in the "New this week" section
// or marking them with a "New" badge would just point users at
// broken-looking cards. Re-enable once the upload pipeline produces
// clean place data (fix in create_new_location).
const NEW_FEATURE_ENABLED = false;

// Single source of truth for "new" — the section filter and the card badge
// both call this so their definitions can't drift apart.
export function isNew(experience: Experience): boolean {
  if (!NEW_FEATURE_ENABLED) return false;
  if (experience.created_at == null) return false;
  return experience.created_at >= Date.now() - SEVEN_DAYS_MS;
}
