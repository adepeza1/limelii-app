"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import type { Experience } from "@/app/page";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

const BOROUGHS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

// Neighborhoods are fetched from the API on mount
type NeighborhoodMap = Record<string, string[]>;

// Known valid boroughs — used to filter out malformed data
const VALID_BOROUGHS = new Set(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]);

function extractNeighborhoods(experiences: Experience[]): NeighborhoodMap {
  const map: Record<string, Set<string>> = {};
  for (const exp of experiences) {
    for (const place of exp.places_id ?? []) {
      const borough = (place.borough ?? "").trim();
      const neighborhood = (place.neighborhood ?? "").trim();
      // Skip missing, unknown, or multi-borough/descriptive values
      if (
        !VALID_BOROUGHS.has(borough) ||
        !neighborhood ||
        neighborhood.toLowerCase() === "unknown" ||
        neighborhood.length > 40
      ) continue;
      (map[borough] ??= new Set()).add(neighborhood);
    }
  }
  const result: NeighborhoodMap = {};
  for (const [borough, hoods] of Object.entries(map)) {
    result[borough] = [...hoods].sort((a, b) => a.localeCompare(b));
  }
  return result;
}

const VIBES = ["Food & Drink", "Nightlife", "Wellness", "Adventure", "Arts & Culture", "Date Night"];
const BUDGETS = ["Free", "$", "$$", "$$$"];
const SETTINGS = ["Indoor", "Outdoor"];

// Maps our UI labels to activity keywords in the data
const VIBE_KEYWORDS: Record<string, string[]> = {
  "Food & Drink": ["food", "drink", "drinks", "dining", "cuisine", "restaurant"],
  "Nightlife":    ["nightlife", "drink", "drinks", "bar", "club", "entertainment"],
  "Wellness":     ["wellness", "spa", "fitness", "yoga", "health"],
  "Adventure":    ["outdoor activity", "recreation activity", "adventure", "experience"],
  "Arts & Culture": ["art gallery", "cultural", "museum", "arts", "culture", "gallery"],
  "Date Night":   ["nightlife", "food", "drink", "entertainment", "dining", "romance"],
};

function parseMaxBudget(b: string): number {
  if (b === "NA" || !b) return 0;
  const nums = b.match(/\d+/g);
  if (!nums) return 0;
  return Math.max(...nums.map(Number));
}

function vibeMatches(activities: string[], vibe: string): boolean {
  if (!vibe) return true;
  const keywords = VIBE_KEYWORDS[vibe] ?? [vibe.toLowerCase()];
  return activities.some((a) =>
    keywords.some((k) => a.toLowerCase().includes(k) || k.includes(a.toLowerCase()))
  );
}

function budgetMatches(budgets: string[], budget: string): boolean {
  if (!budget) return true;
  if (!budgets?.length) return true;
  if (budget === "Free") return budgets.some((b) => b === "NA" || parseMaxBudget(b) <= 10);
  if (budget === "$")    return budgets.some((b) => parseMaxBudget(b) <= 30);
  if (budget === "$$")   return budgets.some((b) => { const m = parseMaxBudget(b); return m > 20 && m <= 75; });
  if (budget === "$$$")  return budgets.some((b) => parseMaxBudget(b) > 50);
  return true;
}

function settingMatches(settings: string[], setting: string): boolean {
  if (!setting) return true;
  if (!settings?.length) return true;
  const lower = setting.toLowerCase();
  return settings.some((s) => s === lower || s === "both");
}

function locationMatches(exp: Experience, borough: string, selectedNeighborhoods: string[]): boolean {
  if (borough === "All NYC" || borough === "__current__") return true;
  const places = exp.places_id ?? [];
  if (selectedNeighborhoods.length > 0) {
    return selectedNeighborhoods.some((neighborhood) => {
      const needle = neighborhood.toLowerCase();
      const expNeighborhoods = (exp.neighborhoods ?? []).map((n) => n.toLowerCase());
      const placeNeighborhoods = places.map((p) => (p.neighborhood ?? "").toLowerCase());
      return [...expNeighborhoods, ...placeNeighborhoods].some(
        (n) => n.includes(needle) || needle.includes(n)
      );
    });
  }
  return places.some((p) => p.borough === borough);
}

function filterExperiences(
  all: Experience[],
  { borough, selectedNeighborhoods, vibes, budgets, setting }: {
    borough: string; selectedNeighborhoods: string[]; vibes: string[]; budgets: string[]; setting: string;
  }
) {
  return all.filter((exp) => {
    if (!locationMatches(exp, borough, selectedNeighborhoods)) return false;
    if (vibes.length > 0 && !vibes.some((v) => vibeMatches(exp.activities ?? [], v))) return false;
    if (budgets.length > 0 && !budgets.some((b) => budgetMatches(exp.budget ?? [], b))) return false;
    if (!settingMatches(exp.indoor_outdoor ?? [], setting)) return false;
    return true;
  });
}

function SkeletonCard() {
  return <div className="w-full aspect-[33/38] rounded-[20px] bg-gray-100 animate-pulse" />;
}

export default function PlanPage() {
  const [location, setLocation] = useState("All NYC");
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<string[]>([]);
  const [setting, setSetting] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodMap>({});

  const currentCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((data) => {
        const all: Experience[] = Object.values(
          (data as { experiences: Record<string, Experience[]> }).experiences
        ).flat();
        setNeighborhoods(extractNeighborhoods(all));
      })
      .catch(() => { /* silently fall back to empty */ });
  }, []);

  const [results, setResults] = useState<Experience[] | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  const neighborhoodOptions = neighborhoods[location] ?? [];

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  function handleCurrentLocation() {
    setLocation("__current__");
    setSelectedNeighborhoods([]);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        () => { /* silently ignore — will search all NYC */ },
        { timeout: 10000 }
      );
    }
  }

  function handleSelectLocation(loc: string) {
    if (location === loc) {
      setLocation("All NYC");
    } else {
      setLocation(loc);
    }
    setSelectedNeighborhoods([]);
  }

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    setFallbackMessage(null);
    setSelectedExperience(null);

    try {
      const res = await fetch(`${API_BASE}/discovery`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const all: Experience[] = Object.values(
        (data as { experiences: Record<string, Experience[]> }).experiences
      ).flat();

      const filters = { borough: location, selectedNeighborhoods, vibes, budgets, setting };
      let matched = filterExperiences(all, filters);

      if (matched.length === 0 && (selectedNeighborhoods.length || vibes.length || budgets.length || setting)) {
        const relaxations: Array<{ label: string; overrides: Partial<typeof filters> }> = [
          { label: `${location} (any neighborhood)`, overrides: { selectedNeighborhoods: [] } },
          { label: `your vibe in ${location}`, overrides: { vibes: [] } },
          { label: `${location} (any budget)`, overrides: { budgets: [] } },
          { label: `${location} (indoor & outdoor)`, overrides: { setting: "" } },
          { label: "all of NYC", overrides: { borough: "All NYC", selectedNeighborhoods: [], vibes: [], budgets: [], setting: "" } },
        ];

        for (const { label, overrides } of relaxations) {
          const relaxed = filterExperiences(all, { ...filters, ...overrides });
          if (relaxed.length > 0) {
            matched = relaxed;
            setFallbackMessage(`No exact matches — showing experiences in ${label} instead.`);
            break;
          }
        }
      }

      setResults(matched);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  if (selectedExperience) {
    return (
      <ExperienceDetail
        experience={selectedExperience}
        onBack={() => setSelectedExperience(null)}
      />
    );
  }

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto relative">
      <div className="h-[44px]" />

      {/* Header */}
      <div className="px-5 pt-4 pb-6">
        <h1 className="text-[#101828] text-[2.25rem] font-bold leading-tight">
          Plan your<br />experience
        </h1>
        <p className="text-[#667085] text-sm mt-2">
          Set your preferences and we&apos;ll find the match.
        </p>
      </div>

      {/* Filter Sections */}
      <div className="px-5 flex flex-col gap-7 pb-6">

        {/* Location */}
        <div>
          <p className="text-[#667085] text-xs font-semibold uppercase tracking-widest mb-3">
            Location
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCurrentLocation}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                location === "__current__"
                  ? "bg-[#FB6983] text-white"
                  : "bg-[#f2f4f7] text-[#1d2939]"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
              Current Location
            </button>
            {BOROUGHS.map((loc) => (
              <button
                type="button"
                key={loc}
                onClick={() => handleSelectLocation(loc)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  location === loc
                    ? "bg-[#FB6983] text-white"
                    : "bg-[#f2f4f7] text-[#1d2939]"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>

          {/* Neighborhood sub-picker */}
          {neighborhoodOptions.length > 0 && (
            <div className="mt-3">
              <p className="text-[#667085] text-xs font-semibold uppercase tracking-widest mb-2">
                Neighborhood
              </p>
              <div className="flex flex-wrap gap-2">
                {neighborhoodOptions.map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => toggleItem(selectedNeighborhoods, setSelectedNeighborhoods, n)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedNeighborhoods.includes(n)
                        ? "bg-[#FF9A56] text-white"
                        : "bg-[#f2f4f7] text-[#1d2939]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vibe */}
        <div>
          <p className="text-[#667085] text-xs font-semibold uppercase tracking-widest mb-3">
            What kind of vibe?
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {VIBES.map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => toggleItem(vibes, setVibes, v)}
                className={`rounded-2xl py-5 px-3 text-sm font-medium text-center transition-colors ${
                  vibes.includes(v)
                    ? "bg-[#FF9A56] text-white"
                    : "bg-[#f2f4f7] text-[#1d2939]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <p className="text-[#667085] text-xs font-semibold uppercase tracking-widest mb-3">
            Budget
          </p>
          <div className="flex gap-2">
            {BUDGETS.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => toggleItem(budgets, setBudgets, b)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  budgets.includes(b)
                    ? "bg-[#FF9A56] text-white"
                    : "bg-[#f2f4f7] text-[#1d2939]"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Setting */}
        <div>
          <p className="text-[#667085] text-xs font-semibold uppercase tracking-widest mb-3">
            Setting
          </p>
          <div className="flex gap-2">
            {SETTINGS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSetting(setting === s ? "" : s)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  setting === s
                    ? "bg-[#FB6983] text-white"
                    : "bg-[#f2f4f7] text-[#1d2939]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 flex flex-col items-center gap-3">
        {!searched && (
          <p className="text-[#667085] text-sm">Choose your filters above</p>
        )}
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-[#FB6983] text-white font-bold text-base rounded-full py-4 flex items-center justify-center disabled:opacity-60 active:opacity-80 transition-opacity"
        >
          {loading ? "Finding..." : "Find experiences"}
        </button>
      </div>

      {/* Results */}
      <div ref={resultsRef} />

      {loading && (
        <div className="px-5 grid grid-cols-2 gap-3 pb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && fallbackMessage && (
        <div className="px-5 pb-3">
          <p className="text-[#667085] text-sm italic">{fallbackMessage}</p>
        </div>
      )}

      {!loading && searched && results && results.length === 0 && (
        <div className="px-5 py-12 text-center">
          <p className="text-[#667085] text-sm">
            No experiences found. Try adjusting your filters.
          </p>
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <div className="px-5 grid grid-cols-2 gap-3 pb-8">
          {results.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onClick={() => setSelectedExperience(exp)}
              className="w-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}
