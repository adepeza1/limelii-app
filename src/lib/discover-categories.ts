import type { Experience } from "@/app/page";

// ─── Frontend Discover categories ───────────────────────────────────────────
//
// The Discover tab bar is derived entirely on the client from the experiences
// already loaded by /discovery — no category_id writes required. Each tab is a
// SMART FILTER: an experience can appear under more than one tab (a cheap,
// late-night bar crawl shows under both "Late Night" and "Budget-Friendly").
//
// Two kinds of match:
//   • Derivable categories (below) match by keyword signal in the experience's
//     title/description/activities/place types — plus the budget field for
//     "Budget-Friendly". (time_of_day is empty across the dataset, so the text
//     does the work.)
//   • Editorial categories (Staff Picks, Hidden Gems) can't be derived from
//     tags, so they match by the Xano category_id that's already in the payload
//     — resolved by name in discover-page.tsx. They have no keyword rule here.
//
// This mirrors the approach explore-view.tsx already uses (VENUE_GRID +
// venueTypeMatches): build a wide text haystack and match keywords against it.

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

const STRONG_W = 5; // strong cue in the title
const CUE_W = 2;    // strong cue in body/tags, or any weak cue
const THRESHOLD = 3; // minimum score to belong to a category

interface KeywordRule {
  strong: string[];
  weak: string[];
}

// Edit these lists to tune what lands in each tab.
const KEYWORDS: Record<string, KeywordRule> = {
  "Cultural Experiences": {
    strong: ["museum", "gallery", "galleries", "cultural", "culture", "history",
      "historic", "heritage", "landmark", "library", "theater", "theatre",
      "lincoln center", "exhibit", "sculpture", "monument", "art &", "art scene",
      "graffiti", "arts", "literary"],
    weak: ["art", "cathedral", "opera", "ballet"],
  },
  "Late Night": {
    strong: ["late night", "2am", "after dark", "nightlife", "dive bar", "night out",
      "bar crawl", "bar hop", "pub crawl", "speakeasy", "cocktail tour", "club"],
    weak: ["bars", "cocktail", "nightcap"],
  },
  "Date Night": {
    strong: ["romance", "romantic", "date night", "sunset", "for two", "candlelit",
      "intimate", "sail", "rooftop", "waterfront"],
    weak: ["evening", "wine", "views", "dinner", "jazz", "cozy", "scenic"],
  },
  "Budget-Friendly": {
    strong: ["free", "cheap", "budget", "dollar slice", "$1", "coffee crawl"],
    weak: ["market", "coffee", "vintage", "thrift", "stroll", "promenade", "park"],
  },
  "Good For Groups": {
    strong: ["karaoke", "ping pong", "escape room", "bowling", "comedy club",
      "girls night", "guys night", "photo walk", "food tour", "brew tour"],
    weak: ["crawl", "hop", "hangout", "group", "tour", "brunch"],
  },
};

function haystack(exp: Experience): { title: string; body: string } {
  const title = norm(exp.title);
  const placeTypes = (exp.places_id ?? [])
    .flatMap((p) => p._location_details?.location_type ?? [])
    .map(norm);
  const tagText = [...(exp.activities ?? []).map(norm), ...placeTypes].join(" ");
  const body = `${norm(exp.description)} ${tagText}`;
  return { title, body };
}

/** Highest dollar midpoint across a budget[] list, or null when unpriced. */
function maxBudget(budget?: string[]): number | null {
  let max: number | null = null;
  for (const b of budget ?? []) {
    const s = norm(b);
    if (s === "na" || s === "") continue;
    if (s.includes("free")) {
      max = Math.max(max ?? 0, 0);
      continue;
    }
    const nums = (s.match(/\d+/g) ?? []).map(Number);
    if (nums.length) {
      const mid = nums.reduce((x, y) => x + y, 0) / nums.length;
      max = Math.max(max ?? 0, mid);
    }
  }
  return max;
}
function hasFree(budget?: string[]): boolean {
  return (budget ?? []).some((b) => norm(b).includes("free"));
}

function keywordScore(exp: Experience, categoryName: string): number {
  const kw = KEYWORDS[categoryName];
  if (!kw) return 0; // editorial category — no keyword rule
  const { title, body } = haystack(exp);
  let s = 0;
  for (const cue of kw.strong) {
    if (title.includes(cue)) s += STRONG_W;
    else if (body.includes(cue)) s += CUE_W;
  }
  for (const cue of kw.weak) {
    if (title.includes(cue) || body.includes(cue)) s += CUE_W;
  }
  // Budget-Friendly also leans on the (populated) budget field.
  if (categoryName === "Budget-Friendly") {
    const mb = maxBudget(exp.budget);
    if (hasFree(exp.budget)) s += STRONG_W;
    else if (mb != null && mb <= 20) s += CUE_W;
    if (mb != null && mb >= 60) return 0; // clearly not budget-friendly
  }
  return s;
}

/** True when the experience has enough keyword signal for this category. */
export function matchesByKeywords(exp: Experience, categoryName: string): boolean {
  return keywordScore(exp, categoryName) >= THRESHOLD;
}

/**
 * Discover category tabs, in display order (after "All").
 * `xanoName` links a tab to an existing Xano category so already-assigned
 * experiences are always included; editorial tabs rely on it entirely.
 */
export interface DiscoverCategory {
  name: string;
  /** Name of the matching Xano category, if any (resolved to an id at runtime). */
  xanoName?: string;
  /** Whether this tab also matches by keyword signal. */
  keyworded: boolean;
}

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  { name: "Good For Groups",      xanoName: "Good For Groups",      keyworded: true },
  { name: "Cultural Experiences", xanoName: "Cultural Experiences", keyworded: true },
  { name: "Date Night",                                             keyworded: true },
  { name: "Late Night",                                             keyworded: true },
  { name: "Budget-Friendly",                                        keyworded: true },
  { name: "Staff Picks",          xanoName: "Staff Picks",          keyworded: false },
  { name: "Hidden Gems",          xanoName: "Hidden Gems",          keyworded: false },
];
