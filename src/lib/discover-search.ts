import type { Experience, Place } from "@/app/page";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "of", "to", "in", "on", "at",
  "by", "with", "from", "about", "into", "is", "are", "was", "were", "be",
  "been", "being", "i", "me", "my", "we", "us", "our", "you", "your",
  "it", "its", "this", "that", "these", "those",
  "some", "any", "all", "no", "not", "want", "wants", "need", "needs",
  "find", "show", "give", "get", "looking", "look", "search",
  "nice", "good", "great", "best", "cool", "fun", "awesome", "amazing",
  "really", "very", "please", "would", "like", "love",
  "place", "places", "spot", "spots", "thing", "things",
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function placeText(place: Place): {
  category: string[];
  name: string;
  area: string[];
  description: string;
} {
  const details = place._location_details;
  return {
    category: [
      ...(details?.location_type ?? []),
      ...(details?.location_subtype ?? []),
      ...(details?.location_variant ?? []),
    ].map((t) => t.toLowerCase()),
    name: (place.name ?? "").toLowerCase(),
    area: [place.neighborhood, place.borough]
      .filter(Boolean)
      .map((s) => s!.toLowerCase()),
    description: (details?.Description ?? "").toLowerCase(),
  };
}

function scorePlace(place: Place, tokens: string[]): number {
  const text = placeText(place);
  let score = 0;
  for (const token of tokens) {
    if (text.category.some((c) => c.includes(token))) score += 5;
    if (text.name.includes(token)) score += 3;
    if (text.area.some((a) => a.includes(token))) score += 2;
    if (text.description.includes(token)) score += 1;
  }
  return score;
}

function scoreExperienceBase(exp: Experience, tokens: string[]): number {
  const title = (exp.title ?? "").toLowerCase();
  const description = (exp.description ?? "").toLowerCase();
  const activities = (exp.activities ?? []).map((a) => a.toLowerCase());
  const neighborhoods = (exp.neighborhoods ?? []).map((n) => n.toLowerCase());

  let score = 0;
  for (const token of tokens) {
    if (activities.some((a) => a.includes(token))) score += 5;
    if (title.includes(token)) score += 3;
    if (neighborhoods.some((n) => n.includes(token))) score += 2;
    if (description.includes(token)) score += 1;
  }
  return score;
}

export interface RankedResult {
  experience: Experience;
  score: number;
  matchedPlaceId: number | null;
}

export function searchAndRank(
  experiences: Experience[],
  query: string,
): RankedResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: RankedResult[] = [];
  for (const exp of experiences) {
    const baseScore = scoreExperienceBase(exp, tokens);

    let bestPlaceScore = 0;
    let bestPlaceId: number | null = null;
    let placesTotal = 0;
    for (const place of exp.places_id ?? []) {
      const ps = scorePlace(place, tokens);
      placesTotal += ps;
      if (ps > bestPlaceScore) {
        bestPlaceScore = ps;
        bestPlaceId = place.id;
      }
    }

    const total = baseScore + placesTotal;
    if (total > 0) {
      results.push({
        experience: exp,
        score: total,
        matchedPlaceId: bestPlaceId,
      });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.experience.rating ?? 0) - (a.experience.rating ?? 0);
  });

  return results;
}
