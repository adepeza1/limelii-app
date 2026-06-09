import type { Place } from "@/app/page";
import type { RnCategory } from "./types";

// Map a place's location_type tokens into a Right Now category. Mirrors the
// taxonomy used by the Explore VENUE_GRID so classification stays consistent.

const TABLES = new Set(
  [
    "Fine Dining", "Casual Dining", "Fast Casual", "Food Hall", "Food Truck", "Food", "Restaurant",
    "Traditional Cafe", "Specialty Coffee", "Work/Study Space", "Cafe", "Coffee",
    "Cocktail Bar", "Wine Bar", "Beer Bar/Brewery", "Dive Bar", "Lounge", "Drink", "Bar",
    "Rooftop Bar", "Rooftop Lounge", "Rooftop Restaurant", "Sky Bar", "Rooftop",
  ].map((s) => s.toLowerCase())
);

const ACTIVITIES = new Set(
  [
    "Museum", "Art Gallery", "Live Theater", "Performance Space", "Cultural", "Arts", "Culture", "Gallery", "Art",
    "Escape Room", "Cooking Class", "Paint & Sip", "Board Game Cafe", "Activity", "Activities", "Entertainment", "Experience",
    "Spa", "Yoga Studio", "Meditation Center", "Fitness Studio", "Wellness", "Health", "Fitness",
    "Public Park", "Botanical Garden", "Beach", "Skate Park", "Outdoor", "Outdoors", "Park", "Nature",
    "Dance Club", "Live Music Club", "Jazz Club", "Comedy Club", "Karaoke Bar", "Nightlife",
  ].map((s) => s.toLowerCase())
);

// Reservation-heavy types we don't treat as walk-in-friendly.
const NOT_WALK_IN = new Set(["fine dining"].map((s) => s.toLowerCase()));

export function classifyPlace(place: Place): { category: RnCategory | null; walkIn: boolean } {
  const details = place._location_details;
  const tokens: string[] = [];
  if (Array.isArray(details?.location_type)) tokens.push(...details!.location_type);
  if (Array.isArray(details?.location_subtype)) tokens.push(...details!.location_subtype!);
  if (Array.isArray(details?.location_variant)) tokens.push(...details!.location_variant!);
  const lowered = tokens.map((t) => (t ?? "").toLowerCase()).filter(Boolean);

  const isTable = lowered.some((t) => TABLES.has(t));
  const isActivity = lowered.some((t) => ACTIVITIES.has(t));

  // Tables takes priority when a venue reads as both (e.g. a bar with live music).
  const category: RnCategory | null = isTable ? "tables" : isActivity ? "activities" : null;
  const walkIn = !lowered.some((t) => NOT_WALK_IN.has(t));
  return { category, walkIn };
}
