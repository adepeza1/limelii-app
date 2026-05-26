import type { Experience } from "@/app/page";
import type { WeatherCondition } from "@/lib/atmosphere-config";

/**
 * Map an Apple WeatherKit `conditionCode` (e.g. "MostlyCloudy", "HeavyRain",
 * "Foggy") to the app's coarse WeatherCondition bucket.
 *
 * WeatherKit ships ~40 codes; we collapse them into the five buckets the UI
 * cares about. Order matters: precipitation is checked before cloud cover so
 * e.g. "ScatteredThunderstorms" lands in `rain`, not `clouds`.
 *
 * Reference: https://developer.apple.com/documentation/weatherkit/weathercondition
 */
export function mapConditionCode(code: string | null | undefined): WeatherCondition {
  if (!code) return "clear";
  const c = code.toLowerCase();
  if (/(drizzle|rain|shower|thunder|tropicalstorm|hurricane)/.test(c)) return "rain";
  if (/(snow|sleet|flurr|blizzard|hail|wintrymix|icy|freezing)/.test(c)) return "snow";
  if (/(fog|haze|smoke|dust)/.test(c)) return "fog";
  // Treat partly-cloudy / mostly-clear / breezy as "clear" — they read as nice out
  if (/(partlycloudy|mostlyclear|clear|sunny|hot|breezy|windy)/.test(c)) return "clear";
  if (/(cloud|overcast)/.test(c)) return "clouds";
  return "clear";
}

/** Comfortable temperature band for being outside (°F). */
function isComfortable(tempF: number): boolean {
  return tempF >= 55 && tempF <= 82;
}

// Tag values we treat as meaningful; everything else ("unknown", "na", "", ...)
// is noise and dropped during normalization.
const KNOWN_TAGS = new Set(["indoor", "outdoor", "both", "mixed"]);

/**
 * Normalize an experience's messy `indoor_outdoor` tags into capability flags.
 * "both"/"mixed" mean the venue works both indoors and out. Noise values are
 * discarded; `tagged` is false when nothing usable remains.
 */
function venueCapability(indoorOutdoor: string[] | undefined) {
  const tags = (indoorOutdoor ?? [])
    .map((t) => t.toLowerCase().trim())
    .filter((t) => KNOWN_TAGS.has(t));
  const flexible = tags.includes("both") || tags.includes("mixed");
  const canOutdoor = flexible || tags.includes("outdoor");
  const canIndoor = flexible || tags.includes("indoor");
  return {
    tagged: tags.length > 0,
    hasOutdoorTag: tags.includes("outdoor"),
    canOutdoor,
    canIndoor,
    outdoorOnly: canOutdoor && !canIndoor,
    indoorOnly: canIndoor && !canOutdoor,
  };
}

/**
 * Multiplier (centered on 1.0) reflecting how well an experience's
 * indoor/outdoor character fits the current weather. Used to re-rank Discover
 * and to populate the "Great for today" section (which keeps only m > 1.05).
 *
 * Tuned so the section is weather-DIFFERENTIATED given limelii's data (which
 * has no purely-outdoor experiences and many indoor/both venues):
 *   - Nice day → outdoor-capable venues qualify (>1.05); indoor-only excluded.
 *   - Grim day → indoor-only venues qualify; flexible/outdoor are kept OUT, so
 *                the shelf is visibly different rather than showing the same
 *                "both"-tagged venues every day.
 *
 * Returns 1.0 (neutral, excluded from the section) when there's no weather
 * signal (tempF == null) or no usable indoor/outdoor tag.
 */
export function weatherFitMultiplier(
  indoorOutdoor: string[] | undefined,
  condition: WeatherCondition,
  tempF: number | null,
): number {
  if (tempF == null) return 1;
  const cap = venueCapability(indoorOutdoor);
  if (!cap.tagged) return 1;

  const precipitating = condition === "rain" || condition === "snow";
  const grim = precipitating || condition === "fog" || !isComfortable(tempF);

  if (grim) {
    if (cap.indoorOnly) return 1.3; // weather-proof — the cozy pick
    if (cap.outdoorOnly) return 0.6; // exposed — strongly demote
    return 1.0; // flexible: usable, but kept out of the section so grim != nice
  }
  // Pleasant: clear/clouds + comfortable temp → reward outdoor capability.
  if (cap.outdoorOnly) return 1.4;
  if (cap.canOutdoor) return cap.hasOutdoorTag ? 1.25 : 1.15; // explicit-outdoor leads "both"-only
  return 0.85; // indoor-only — gently demote on a great day
}

/** Fisher-Yates shuffle (returns a new array, leaves the input untouched). */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick the experiences that best fit today's weather. Only clearly-favorable
 * picks (multiplier > 1.05) are included; returns [] when there's no weather
 * signal.
 *
 * We shuffle THEN stable-sort by multiplier: weather-appropriate tiers stay on
 * top, but the picks vary within a tier. Without this the section would be
 * deterministic and — because every experience currently has rating 0 — would
 * always surface the same items in DB order (i.e. only the categorized ones).
 * Shuffling per call means a fresh selection on each cold start.
 */
export function greatForToday(
  experiences: Experience[],
  condition: WeatherCondition,
  tempF: number | null,
  limit = 10,
): Experience[] {
  if (tempF == null) return [];
  const qualifying = experiences
    .map((exp) => ({ exp, m: weatherFitMultiplier(exp.indoor_outdoor, condition, tempF) }))
    .filter(({ m }) => m > 1.05);
  return shuffled(qualifying)
    .sort((a, b) => b.m - a.m)
    .slice(0, limit)
    .map(({ exp }) => exp);
}

/** Heading for the weather-driven section, tuned to the current conditions.
 *  Matches weatherFitMultiplier's comfort band so the heading and the picks
 *  always agree (e.g. a hot day shows indoor picks under "Beat the heat"). */
export function greatForTodayTitle(condition: WeatherCondition, tempF: number | null): string {
  if (tempF == null) return "Great for today";
  const wet = condition === "rain" || condition === "snow" || condition === "fog";
  if (wet || tempF < 55) return "Cozy picks for today"; // cold or wet → warm & indoor
  if (tempF > 82) return "Beat the heat today"; // too hot → cool & indoor
  return "Great for today's weather"; // pleasant → get outside
}

/** One-line weather summary for the Discover header, e.g. "It's 72° and clear". */
export function describeWeather(condition: WeatherCondition, tempF: number | null): string | null {
  if (tempF == null) return null;
  const phrase: Record<WeatherCondition, string> = {
    clear: "clear",
    clouds: "cloudy",
    rain: "rainy",
    snow: "snowy",
    fog: "foggy",
  };
  return `It's ${Math.round(tempF)}° and ${phrase[condition]}`;
}
