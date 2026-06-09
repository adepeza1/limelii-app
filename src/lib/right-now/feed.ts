import { API_BASE } from "@/lib/xano";
import type { DiscoveryResponse } from "@/app/page";
import { isOpenNow } from "./hours";
import { classifyPlace } from "./classify";
import type { RightNowCard } from "./types";

export const NYC_CENTER = { lat: 40.7128, lng: -74.006 };

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapsSearchUrl(name: string, neighborhood?: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name} ${neighborhood ?? ""}`.trim()
  )}`;
}

export interface FeedParams {
  lat: number;
  lng: number;
  radius?: number; // miles
  hours?: number; // events window
}

/**
 * Builds the live "available now near you" feed from real sources:
 *  - Events  → /api/right-now/events (Ticketmaster, server-side)
 *  - Tables & Activities → existing public Xano /discovery, filtered to
 *    open-now + within radius (+ walk-in-friendly for tables).
 */
export async function fetchRightNowFeed({ lat, lng, radius = 2, hours = 24 }: FeedParams): Promise<RightNowCard[]> {
  const [eventsRes, discRes] = await Promise.allSettled([
    fetch(`/api/right-now/events?lat=${lat}&lng=${lng}&radius=${radius}&hours=${hours}`).then((r) => r.json()),
    fetch(`${API_BASE}/discovery`).then((r) => r.json()),
  ]);

  const eventCards: RightNowCard[] =
    eventsRes.status === "fulfilled" ? (eventsRes.value?.items ?? []) : [];
  for (const e of eventCards) {
    if (e.lat != null && e.lng != null) e.distanceMi = haversineMi(lat, lng, e.lat, e.lng);
  }

  const placeCards: RightNowCard[] = [];
  if (discRes.status === "fulfilled") {
    const disc = discRes.value as DiscoveryResponse;
    const seen = new Set<number>();
    for (const list of Object.values(disc.experiences ?? {})) {
      for (const exp of list ?? []) {
        for (const place of exp.places_id ?? []) {
          if (!place || seen.has(place.id)) continue;
          seen.add(place.id);

          const { category, walkIn } = classifyPlace(place);
          if (!category) continue;
          if (category === "tables" && !walkIn) continue;

          const open = isOpenNow(place._location_details?.operating_hours ?? "");
          if (!open.openNow) continue;

          const ll = place.latlong?.data;
          const dist = ll ? haversineMi(lat, lng, ll.lat, ll.lng) : undefined;
          if (dist != null && dist > radius) continue;

          const imageUrl =
            place.display_images?.find((i) => i.url)?.url ?? place.images?.find((i) => i.url)?.url;
          const type = place._location_details?.location_type?.[0];

          placeCards.push({
            id: `place:${place.id}`,
            category,
            title: place.name,
            subtitle: type,
            imageUrl,
            neighborhood: place.neighborhood,
            lat: ll?.lat,
            lng: ll?.lng,
            distanceMi: dist,
            availability: { openNow: true, closesAt: open.closesAt, walkIn },
            sourceType: "limelii",
            action: {
              label: category === "tables" ? "Reserve / Menu" : "View Details",
              url: place._location_details?.url || mapsSearchUrl(place.name, place.neighborhood),
            },
          });
        }
      }
    }
  }

  return [...placeCards, ...eventCards].sort(
    (a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity)
  );
}
