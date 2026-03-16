"use client";

import { useState, useRef } from "react";
import { MapPin } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import type { Experience } from "@/app/page";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

const BOROUGHS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

// TODO: Replace with API call to /neighborhoods?borough=<borough> when endpoint is available
const NEIGHBORHOODS: Record<string, string[]> = {
  Manhattan: [
    "Battery Park City", "Carnegie Hill", "Chelsea", "Chinatown", "Civic Center",
    "East Harlem", "East Village", "Financial District", "Flatiron", "Gramercy Park",
    "Greenwich Village", "Hamilton Heights", "Harlem", "Hell's Kitchen", "Inwood",
    "Kips Bay", "Lenox Hill", "Lincoln Square", "Little Italy", "Lower East Side",
    "Midtown", "Morningside Heights", "Murray Hill", "NoHo", "NoMad", "Nolita",
    "Roosevelt Island", "SoHo", "Tribeca", "Two Bridges", "Upper East Side",
    "Upper West Side", "Washington Heights", "West Village", "Yorkville",
  ],
  Brooklyn: [
    "Bay Ridge", "Bed-Stuy", "Bensonhurst", "Boerum Hill", "Borough Park",
    "Brighton Beach", "Brooklyn Heights", "Brownsville", "Bushwick", "Canarsie",
    "Carroll Gardens", "Clinton Hill", "Cobble Hill", "Coney Island", "Crown Heights",
    "DUMBO", "Ditmas Park", "Downtown Brooklyn", "Dyker Heights", "East Flatbush",
    "Flatbush", "Fort Greene", "Gowanus", "Gravesend", "Greenpoint",
    "Greenwood Heights", "Midwood", "Park Slope", "Prospect Heights",
    "Prospect Lefferts Gardens", "Red Hook", "Sheepshead Bay", "Sunset Park",
    "Williamsburg", "Windsor Terrace",
  ],
  Queens: [
    "Astoria", "Bayside", "Briarwood", "College Point", "Corona",
    "East Elmhurst", "Elmhurst", "Far Rockaway", "Flushing", "Forest Hills",
    "Fresh Meadows", "Glendale", "Howard Beach", "Jackson Heights", "Jamaica",
    "Kew Gardens", "Long Island City", "Maspeth", "Middle Village", "Ozone Park",
    "Rego Park", "Richmond Hill", "Ridgewood", "Rosedale", "Sunnyside",
    "Whitestone", "Woodhaven", "Woodside",
  ],
  Bronx: [
    "Allerton", "Baychester", "Bedford Park", "Belmont", "City Island",
    "Co-op City", "Concourse", "Country Club", "East Tremont", "Fordham",
    "High Bridge", "Hunts Point", "Kingsbridge", "Longwood", "Melrose",
    "Morris Park", "Morrisania", "Mott Haven", "Norwood", "Parkchester",
    "Pelham Bay", "Riverdale", "Soundview", "Throgs Neck", "Tremont",
    "University Heights", "Wakefield", "Williamsbridge", "Woodlawn",
  ],
  "Staten Island": [
    "Annadale", "Arden Heights", "Castleton Corners", "Clifton", "Dongan Hills",
    "Eltingville", "Grasmere", "Great Kills", "Mariners Harbor", "Midland Beach",
    "New Brighton", "New Dorp", "New Springville", "Port Richmond", "Rosebank",
    "South Beach", "St. George", "Stapleton", "Tompkinsville", "Tottenville",
    "West Brighton", "Westerleigh",
  ],
};

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

function locationMatches(exp: Experience, borough: string, neighborhood: string): boolean {
  if (borough === "All NYC" || borough === "__current__") return true;
  const places = exp.places_id ?? [];
  if (neighborhood) {
    const needle = neighborhood.toLowerCase();
    const expNeighborhoods = (exp.neighborhoods ?? []).map((n) => n.toLowerCase());
    const placeNeighborhoods = places.map((p) => (p.neighborhood ?? "").toLowerCase());
    return [...expNeighborhoods, ...placeNeighborhoods].some(
      (n) => n.includes(needle) || needle.includes(n)
    );
  }
  return places.some((p) => p.borough === borough);
}

function filterExperiences(
  all: Experience[],
  { borough, neighborhood, vibe, budget, setting }: {
    borough: string; neighborhood: string; vibe: string; budget: string; setting: string;
  }
) {
  return all.filter(
    (exp) =>
      locationMatches(exp, borough, neighborhood) &&
      vibeMatches(exp.activities ?? [], vibe) &&
      budgetMatches(exp.budget ?? [], budget) &&
      settingMatches(exp.indoor_outdoor ?? [], setting)
  );
}

function SkeletonCard() {
  return <div className="w-full aspect-[33/38] rounded-[20px] bg-gray-100 animate-pulse" />;
}

export default function PlanPage() {
  const [location, setLocation] = useState("All NYC");
  const [neighborhood, setNeighborhood] = useState("");
  const [vibe, setVibe] = useState("");
  const [budget, setBudget] = useState("");
  const [setting, setSetting] = useState("");

  const currentCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const [results, setResults] = useState<Experience[] | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  const neighborhoodOptions = NEIGHBORHOODS[location] ?? [];

  function handleCurrentLocation() {
    // Select the pill immediately — resolve coords silently in background
    setLocation("__current__");
    setNeighborhood("");
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
      setNeighborhood("");
    } else {
      setLocation(loc);
      setNeighborhood("");
    }
  }

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    setFallbackMessage(null);
    setSelectedExperience(null);

    try {
      // Fetch all experiences — API location/budget/setting filters are unreliable;
      // we apply all filtering client-side for accuracy.
      const body: Record<string, string> = {};
      if (location === "__current__" && currentCoordsRef.current) {
        body.lat = String(currentCoordsRef.current.lat);
        body.lng = String(currentCoordsRef.current.lng);
      }

      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Search failed");
      const all: Experience[] = await res.json();

      const filters = { borough: location, neighborhood, vibe, budget, setting };

      // Try exact match with all filters
      let matched = filterExperiences(all, filters);

      if (matched.length === 0 && (neighborhood || vibe || budget || setting)) {
        // Relax neighborhood first, then other filters one by one
        const relaxations: Array<{ label: string; overrides: Partial<typeof filters> }> = [
          { label: `${location} (any neighborhood)`, overrides: { neighborhood: "" } },
          { label: `your vibe in ${neighborhood || location}`, overrides: { vibe: "" } },
          { label: `${neighborhood || location} (any budget)`, overrides: { budget: "" } },
          { label: `${neighborhood || location} (indoor & outdoor)`, overrides: { setting: "" } },
          { label: "all of NYC", overrides: { borough: "All NYC", neighborhood: "", vibe: "", budget: "", setting: "" } },
        ];

        for (const { label, overrides } of relaxations) {
          const relaxed = filterExperiences(all, { ...filters, ...overrides });
          if (relaxed.length > 0) {
            matched = relaxed;
            setFallbackMessage(
              `No exact matches found — showing experiences in ${label} instead.`
            );
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
                    onClick={() => setNeighborhood(neighborhood === n ? "" : n)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      neighborhood === n
                        ? "bg-[#FB6983] text-white"
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
                onClick={() => setVibe(vibe === v ? "" : v)}
                className={`rounded-2xl py-5 px-3 text-sm font-medium text-center transition-colors ${
                  vibe === v
                    ? "bg-[#FB6983] text-white"
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
                onClick={() => setBudget(budget === b ? "" : b)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  budget === b
                    ? "bg-[#FB6983] text-white"
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
        <div className="px-5 flex flex-col gap-4 pb-8">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
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
        <div className="px-5 flex flex-col gap-4 pb-8">
          {results.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onClick={() => setSelectedExperience(exp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
