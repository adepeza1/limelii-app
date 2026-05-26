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

const OUTDOOR_TAGS = ["outdoor", "both", "mixed"];

/**
 * Multiplier (centered on 1.0) reflecting how well an experience's
 * indoor/outdoor character fits the current weather. Used to re-rank Discover.
 *
 * Returns 1.0 (neutral) when there's no weather signal yet (tempF == null) or
 * the experience has no indoor/outdoor tags, so we never penalize on a cold
 * start before the device location + weather have resolved.
 */
export function weatherFitMultiplier(
  indoorOutdoor: string[] | undefined,
  condition: WeatherCondition,
  tempF: number | null,
): number {
  if (tempF == null) return 1;
  const tags = (indoorOutdoor ?? []).map((t) => t.toLowerCase());
  if (tags.length === 0) return 1;

  const isOutdoor = tags.includes("outdoor") && !tags.includes("indoor");
  const isIndoor = tags.includes("indoor") && !tags.includes("outdoor");
  const hasOutdoor = tags.some((t) => OUTDOOR_TAGS.includes(t));

  const precipitating = condition === "rain" || condition === "snow";
  const grim = precipitating || condition === "fog" || !isComfortable(tempF);

  if (grim) {
    if (isOutdoor) return 0.75; // strongly demote fully-outdoor when it's grim
    if (isIndoor) return 1.2; // boost cozy indoor
    return 0.92; // mixed: slight nudge down
  }
  // Pleasant: clear/clouds + comfortable temp
  if (hasOutdoor) return 1.25; // boost anything with outdoor appeal
  if (isIndoor) return 0.9; // gently demote pure-indoor on a great day
  return 1;
}

/**
 * Rank experiences by how well they fit today's weather and return the best
 * matches. Only clearly-favorable picks (multiplier > 1.05) are included, so
 * the section stays empty rather than showing poor fits. Returns [] when
 * there's no weather signal.
 */
export function greatForToday(
  experiences: Experience[],
  condition: WeatherCondition,
  tempF: number | null,
  limit = 10,
): Experience[] {
  if (tempF == null) return [];
  return experiences
    .map((exp) => ({ exp, m: weatherFitMultiplier(exp.indoor_outdoor, condition, tempF) }))
    .filter(({ m }) => m > 1.05)
    .sort((a, b) => b.m - a.m || (b.exp.rating ?? 0) - (a.exp.rating ?? 0))
    .slice(0, limit)
    .map(({ exp }) => exp);
}

/** Heading for the weather-driven section, tuned to the current conditions. */
export function greatForTodayTitle(condition: WeatherCondition, tempF: number | null): string {
  if (tempF == null) return "Great for today";
  const grim = condition === "rain" || condition === "snow" || condition === "fog" || tempF < 55;
  return grim ? "Cozy picks for today" : "Great for today's weather";
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
