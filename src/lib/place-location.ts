// Returns the best human-readable location label for a place.
// Treats the literal "unknown" (case-insensitive) the same as missing
// — callOpenAI can return that when it can't identify the neighborhood,
// and surfacing the word would confuse users.
export function getPlaceLocation(place: { neighborhood?: string; borough?: string }): string {
  const hood = place.neighborhood?.trim();
  if (hood && hood.toLowerCase() !== "unknown") return hood;
  if (place.borough) return place.borough.trim();
  return "";
}
