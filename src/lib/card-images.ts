import type { Experience, Place } from "@/app/page";

// Mirror of ExperienceCard's image resolution, so the dedupe below keys on the
// exact URL the card would actually render.
function placeImage(place: Place): string | null {
  return (place.display_images ?? []).find((img) => img.url)?.url
    ?? (place.images ?? []).find((img) => img.url)?.url
    ?? null;
}

// Two experiences that reuse the same venue as their first stop render the same
// photo on their cards. Given a list of experiences shown together, pick an
// `initialPlaceId` for each so those photos don't repeat where a distinct one
// exists: walk the list in order and surface the first stop whose image hasn't
// already appeared. When every stop's image is taken (or the experience has a
// single image), fall back to the default first stop and accept the repeat.
//
// This is a display-only mitigation — it changes which stop a card opens on,
// not the underlying data. Returns a Map of experience id → the place id the
// card should open on; experiences with no images are absent and render with
// default behavior.
export function dedupeCardImages(experiences: Experience[]): Map<number, number> {
  const used = new Set<string>();
  const initialPlaceIds = new Map<number, number>();
  for (const exp of experiences) {
    const places = Array.isArray(exp.places_id) ? exp.places_id : [];
    const withImage = places.filter((p) => placeImage(p) != null);
    if (withImage.length === 0) continue;
    const pick = withImage.find((p) => !used.has(placeImage(p)!)) ?? withImage[0];
    used.add(placeImage(pick)!);
    initialPlaceIds.set(exp.id, pick.id);
  }
  return initialPlaceIds;
}
