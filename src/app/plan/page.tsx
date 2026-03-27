"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  SlidersHorizontal,
  X,
  UtensilsCrossed,
  Coffee,
  Wine,
  Building2,
  Music,
  Palette,
  Zap,
  Leaf,
  TreePine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import type { Experience } from "@/app/page";
import { API_BASE } from "@/lib/xano";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOROUGHS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const VALID_BOROUGHS = new Set(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]);
const BUDGETS = ["Free", "$", "$$", "$$$"];
const SETTINGS = ["Indoor", "Outdoor"];

const QUICK_VIBES = [
  { label: "Date Night",     types: ["Fine Dining", "Cocktail Bar"] },
  { label: "Rooftop Drinks", types: ["Rooftop Bar", "Rooftop Lounge", "Rooftop Restaurant"] },
  { label: "Cozy Cafe",      types: ["Traditional Cafe", "Specialty Coffee"] },
  { label: "Art & Culture",  types: ["Museum", "Art Gallery", "Live Theater"] },
  { label: "Night Out",      types: ["Dance Club", "Live Music Club", "Jazz Club", "Comedy Club"] },
  { label: "Fresh Air",      types: ["Public Park", "Botanical Garden", "Beach"] },
];

const VENUE_GRID: { label: string; types: string[]; gradient: string; icon: LucideIcon }[] = [
  { label: "Dining",         types: ["Fine Dining", "Casual Dining", "Fast Casual", "Food Hall", "Food Truck"],   gradient: "from-orange-400 to-amber-500",   icon: UtensilsCrossed },
  { label: "Coffee & Cafe",  types: ["Traditional Cafe", "Specialty Coffee", "Work/Study Space"],                  gradient: "from-amber-800 to-amber-600",    icon: Coffee },
  { label: "Bars",           types: ["Cocktail Bar", "Wine Bar", "Beer Bar/Brewery", "Dive Bar", "Lounge"],        gradient: "from-purple-600 to-indigo-500",  icon: Wine },
  { label: "Rooftop",        types: ["Rooftop Bar", "Rooftop Lounge", "Rooftop Restaurant", "Sky Bar"],           gradient: "from-sky-400 to-blue-600",       icon: Building2 },
  { label: "Nightlife",      types: ["Dance Club", "Live Music Club", "Jazz Club", "Comedy Club", "Karaoke Bar"], gradient: "from-fuchsia-600 to-pink-600",   icon: Music },
  { label: "Arts & Culture", types: ["Museum", "Art Gallery", "Live Theater", "Performance Space"],                gradient: "from-rose-500 to-red-500",       icon: Palette },
  { label: "Activities",     types: ["Escape Room", "Cooking Class", "Paint & Sip", "Board Game Cafe"],           gradient: "from-green-500 to-emerald-500",  icon: Zap },
  { label: "Wellness",       types: ["Spa", "Yoga Studio", "Meditation Center", "Fitness Studio"],                 gradient: "from-teal-400 to-cyan-500",      icon: Leaf },
  { label: "Outdoors",       types: ["Public Park", "Botanical Garden", "Beach", "Skate Park"],                   gradient: "from-lime-500 to-green-600",     icon: TreePine },
];

type NeighborhoodMap = Record<string, string[]>;

// ─── Filter helpers ───────────────────────────────────────────────────────────

function extractNeighborhoods(experiences: Experience[]): NeighborhoodMap {
  const map: Record<string, Set<string>> = {};
  for (const exp of experiences) {
    for (const place of exp.places_id ?? []) {
      const borough = (place.borough ?? "").trim();
      const neighborhood = (place.neighborhood ?? "").trim();
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

function parseMaxBudget(b: string): number {
  if (b === "NA" || !b) return 0;
  const nums = b.match(/\d+/g);
  if (!nums) return 0;
  return Math.max(...nums.map(Number));
}

function budgetMatches(expBudgets: string[], budget: string): boolean {
  if (!budget) return true;
  if (!expBudgets?.length) return true;
  const paidEntries = expBudgets.filter((b) => b !== "NA");
  const maxCost = paidEntries.length > 0 ? Math.max(...paidEntries.map(parseMaxBudget)) : 0;
  if (budget === "Free") return paidEntries.length === 0 || maxCost <= 10;
  if (budget === "$")    return maxCost <= 30;
  if (budget === "$$")   return maxCost > 20 && maxCost <= 75;
  if (budget === "$$$")  return maxCost > 50;
  return true;
}

function venueTypeMatches(exp: Experience, selectedTypes: string[]): boolean {
  if (!selectedTypes.length) return true;
  const allTypes = (exp.places_id ?? []).flatMap((p) => p._location_details?.location_type ?? []);
  return selectedTypes.some((t) => allTypes.some((at) => at.toLowerCase() === t.toLowerCase()));
}

function settingMatches(settings: string[], selectedSettings: string[]): boolean {
  if (!selectedSettings.length) return true;
  if (!settings?.length) return true;
  return selectedSettings.some((sel) => {
    const lower = sel.toLowerCase();
    return settings.some((s) => s === lower || s === "both");
  });
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
  { borough, selectedNeighborhoods, budgets, settings, venueTypes }: {
    borough: string; selectedNeighborhoods: string[]; budgets: string[]; settings: string[]; venueTypes: string[];
  }
) {
  return all.filter((exp) => {
    if (!locationMatches(exp, borough, selectedNeighborhoods)) return false;
    if (budgets.length > 0 && !budgets.some((b) => budgetMatches(exp.budget ?? [], b))) return false;
    if (!settingMatches(exp.indoor_outdoor ?? [], settings)) return false;
    if (!venueTypeMatches(exp, venueTypes)) return false;
    return true;
  });
}

function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
  setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
}

// ─── Map (dynamic, client-only) ───────────────────────────────────────────────

const PlanBackgroundMap = dynamic(
  () => import("./plan-map").then((m) => m.PlanMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-200" /> }
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [location, setLocation] = useState("All NYC");
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<string[]>([]);
  const [settings, setSettings] = useState<string[]>([]);
  const [venueTypes, setVenueTypes] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<Experience[] | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outsideNYC, setOutsideNYC] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodMap>({});
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const currentCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((data) => {
        const all: Experience[] = Object.values(
          (data as { experiences: Record<string, Experience[]> }).experiences
        ).flat();
        setAllExperiences(all);
        setNeighborhoods(extractNeighborhoods(all));
      })
      .catch(() => {});
  }, []);

  const matchedExperiences = useMemo(() => {
    return filterExperiences(allExperiences, {
      borough: location,
      selectedNeighborhoods,
      budgets,
      settings,
      venueTypes,
    });
  }, [allExperiences, location, selectedNeighborhoods, budgets, settings, venueTypes]);

  const neighborhoodOptions = neighborhoods[location] ?? [];

  function handleCurrentLocation() {
    setLocation("__current__");
    setSelectedNeighborhoods([]);
    setOutsideNYC(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const inNYC = lat >= 40.4774 && lat <= 40.9176 && lng >= -74.2591 && lng <= -73.7004;
          if (inNYC) { currentCoordsRef.current = { lat, lng }; }
          else { setOutsideNYC(true); setLocation("All NYC"); }
        },
        () => {},
        { timeout: 10000 }
      );
    }
  }

  function handleSelectLocation(loc: string) {
    setLocation(location === loc ? "All NYC" : loc);
    setSelectedNeighborhoods([]);
    setOutsideNYC(false);
  }

  function handleQuickVibe(types: string[]) {
    const allSelected = types.every((t) => venueTypes.includes(t));
    if (allSelected) {
      setVenueTypes(venueTypes.filter((t) => !types.includes(t)));
    } else {
      setVenueTypes([...new Set([...venueTypes, ...types])]);
    }
  }

  function handleVenueGrid(types: string[]) {
    const allSelected = types.every((t) => venueTypes.includes(t));
    if (allSelected) {
      setVenueTypes(venueTypes.filter((t) => !types.includes(t)));
    } else {
      setVenueTypes([...new Set([...venueTypes, ...types])]);
    }
  }

  async function handleSearch() {
    setLoading(true);
    setFallbackMessage(null);

    try {
      const res = await fetch(`${API_BASE}/discovery`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const all: Experience[] = Object.values(
        (data as { experiences: Record<string, Experience[]> }).experiences
      ).flat();

      const filters = { borough: location, selectedNeighborhoods, budgets, settings, venueTypes };
      let matched = filterExperiences(all, filters);

      if (matched.length === 0 && (selectedNeighborhoods.length || budgets.length || settings.length || venueTypes.length)) {
        const relaxations = [
          { label: `${location} (any neighborhood)`, overrides: { selectedNeighborhoods: [] } },
          { label: `${location} (any venue type)`,   overrides: { venueTypes: [] } },
          { label: `${location} (any budget)`,        overrides: { budgets: [] } },
          { label: `${location} (indoor & outdoor)`,  overrides: { settings: [] } },
          { label: "all of NYC",                       overrides: { borough: "All NYC", selectedNeighborhoods: [], budgets: [], settings: [], venueTypes: [] } },
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
      setResultsOpen(true);
    } catch {
      setResults([]);
      setResultsOpen(true);
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 overflow-hidden">

      {/* ── Map background ── */}
      <div className="absolute inset-0 z-0">
        <PlanBackgroundMap experiences={matchedExperiences} />
      </div>

      {/* ── Top title overlay ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 44px) + 12px)" }}>
        <h1 className="text-2xl font-bold text-gray-900" style={{ textShadow: "0 1px 4px rgba(255,255,255,0.8)" }}>Explore</h1>
        <p className="text-sm text-gray-600 mt-0.5" style={{ textShadow: "0 1px 3px rgba(255,255,255,0.8)" }}>Find the perfect match</p>
      </div>

      {/* ── Floating Filters button ── */}
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="fixed z-30 flex items-center gap-1.5 bg-white rounded-full px-4 py-2 shadow-lg text-sm font-medium text-gray-800"
        style={{ bottom: "calc(62dvh + 12px)", right: "16px" }}
      >
        <SlidersHorizontal className="w-4 h-4" strokeWidth={1.8} />
        Filters
      </button>

      {/* ── Bottom sheet ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.10)]"
        style={{ height: "62dvh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto"
          style={{ height: "calc(62dvh - 28px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
        >
          {/* Quick Vibe */}
          <div className="px-4 pb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Quick Vibe</p>
            <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
              {QUICK_VIBES.map((vibe) => {
                const active = vibe.types.every((t) => venueTypes.includes(t));
                return (
                  <button
                    key={vibe.label}
                    type="button"
                    onClick={() => handleQuickVibe(vibe.types)}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5"
                  >
                    <div
                      className="w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all"
                      style={{ background: active ? "#FF9A56" : "#1f2937" }}
                    >
                      <span className="text-white text-[10px] font-semibold text-center leading-tight px-2">{vibe.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Venue Type Grid */}
          <div className="px-4 pb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              What kind of vibe are you looking for?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {VENUE_GRID.map(({ label, types, gradient, icon: Icon }) => {
                const active = types.some((t) => venueTypes.includes(t));
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleVenueGrid(types)}
                    className={`relative aspect-square rounded-2xl bg-gradient-to-br ${gradient} flex flex-col items-start justify-end p-2.5 overflow-hidden transition-all ${
                      active ? "ring-2 ring-white ring-offset-1 ring-offset-white/50" : ""
                    }`}
                  >
                    <Icon className="absolute top-2.5 right-2.5 w-4 h-4 text-white/70" strokeWidth={1.5} />
                    <span className="text-white text-[11px] font-semibold leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Count + CTA */}
          <div className="px-4 pb-2 flex flex-col items-center gap-2">
            <p className="text-sm text-gray-400">
              {allExperiences.length === 0
                ? "Loading experiences…"
                : `Experiences found: ${matchedExperiences.length}`}
            </p>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || allExperiences.length === 0}
              className="w-full bg-[#FB6983] text-white font-bold text-base rounded-full py-4 disabled:opacity-60 active:opacity-80 transition-opacity"
            >
              {loading ? "Finding…" : `Explore ${matchedExperiences.length} experiences`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters Drawer ── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-y-auto"
            style={{ maxHeight: "85dvh" }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-white z-10 border-b border-gray-50">
              <p className="text-base font-semibold text-gray-900">Filters</p>
              <button type="button" onClick={() => setFiltersOpen(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="px-4 pt-4 flex flex-col gap-6"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            >
              {/* Location */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Location</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCurrentLocation}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                      location === "__current__" ? "bg-[#FB6983] text-white" : "bg-[#f2f4f7] text-[#1d2939]"
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
                        location === loc ? "bg-[#FB6983] text-white" : "bg-[#f2f4f7] text-[#1d2939]"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>

                {outsideNYC && (
                  <div className="mt-3 rounded-2xl border border-[#FF9A56] px-4 py-4 relative">
                    <button onClick={() => setOutsideNYC(false)} className="absolute top-3 right-3 text-gray-400" aria-label="Dismiss">
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-sm font-medium text-[#101828]">We&apos;re not in your area yet</p>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">We&apos;re currently in NYC and expanding soon.</p>
                    <a
                      href="mailto:hello@limelii.com?subject=Notify me when Limelii launches near me"
                      className="mt-2 inline-block bg-black text-white text-xs font-medium rounded-full px-4 py-2"
                    >
                      Notify me
                    </a>
                  </div>
                )}

                {neighborhoodOptions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Neighborhood</p>
                    <div className="flex flex-wrap gap-2">
                      {neighborhoodOptions.map((n) => (
                        <button
                          type="button"
                          key={n}
                          onClick={() => toggleItem(selectedNeighborhoods, setSelectedNeighborhoods, n)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            selectedNeighborhoods.includes(n) ? "bg-[#FF9A56] text-white" : "bg-[#f2f4f7] text-[#1d2939]"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Budget */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Budget</p>
                <div className="flex gap-2">
                  {BUDGETS.map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => toggleItem(budgets, setBudgets, b)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                        budgets.includes(b) ? "bg-[#FF9A56] text-white" : "bg-[#f2f4f7] text-[#1d2939]"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Setting</p>
                <div className="flex gap-2">
                  {SETTINGS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleItem(settings, setSettings, s)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                        settings.includes(s) ? "bg-[#FB6983] text-white" : "bg-[#f2f4f7] text-[#1d2939]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full bg-gray-900 text-white font-semibold rounded-full py-3.5 text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Results Panel ── */}
      {resultsOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100 shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 44px) + 12px)" }}
          >
            <button type="button" onClick={() => setResultsOpen(false)} className="p-1 text-gray-400">
              <X className="w-5 h-5" />
            </button>
            <p className="font-semibold text-gray-900 text-base">
              {results?.length ?? 0} experiences
            </p>
          </div>

          {fallbackMessage && (
            <div className="px-4 py-2 bg-orange-50 shrink-0">
              <p className="text-xs text-orange-600">{fallbackMessage}</p>
            </div>
          )}

          {/* Masonry grid */}
          <div
            className="flex-1 overflow-y-auto px-4 pt-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
          >
            {results && results.length > 0 ? (
              <div className="columns-2 gap-3">
                {results.map((exp) => (
                  <div key={exp.id} className="break-inside-avoid mb-3">
                    <ExperienceCard
                      experience={exp}
                      onClick={() => setSelectedExperience(exp)}
                      compact
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-gray-500 text-sm">No experiences found. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
