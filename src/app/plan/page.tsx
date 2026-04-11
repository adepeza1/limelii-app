"use client";

import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  MapPin, SlidersHorizontal, X,
  UtensilsCrossed, Coffee, Wine, Building2, Music, Palette, Zap, Leaf, TreePine,
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

// Include both specific and generic (Xano) type labels so matching works
const QUICK_VIBES = [
  { label: "Date Night",     types: ["Fine Dining", "Cocktail Bar", "Food", "Drink", "Bar", "Restaurant"], photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=200&q=80" },
  { label: "Rooftop Drinks", types: ["Rooftop Bar", "Rooftop Lounge", "Rooftop Restaurant", "Rooftop", "Drink"],  photo: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=200&q=80" },
  { label: "Cozy Cafe",      types: ["Traditional Cafe", "Specialty Coffee", "Cafe", "Coffee"],                    photo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=200&q=80" },
  { label: "Art & Culture",  types: ["Museum", "Art Gallery", "Live Theater", "Cultural", "Arts", "Culture", "Art", "Gallery"], photo: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=200&q=80" },
  { label: "Night Out",      types: ["Dance Club", "Live Music Club", "Jazz Club", "Comedy Club", "Nightlife"],    photo: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=200&q=80" },
  { label: "Fresh Air",      types: ["Public Park", "Botanical Garden", "Beach", "Outdoor", "Outdoors", "Park"],  photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=200&q=80" },
];

const VENUE_GRID: { label: string; types: string[]; gradient: string; icon: LucideIcon; photo: string }[] = [
  { label: "Dining",         types: ["Fine Dining","Casual Dining","Fast Casual","Food Hall","Food Truck","Food","Restaurant"],                          gradient: "from-orange-400 to-amber-500",  icon: UtensilsCrossed, photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80" },
  { label: "Coffee & Cafe",  types: ["Traditional Cafe","Specialty Coffee","Work/Study Space","Cafe","Coffee"],                                           gradient: "from-amber-800 to-amber-600",   icon: Coffee,          photo: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80" },
  { label: "Bars",           types: ["Cocktail Bar","Wine Bar","Beer Bar/Brewery","Dive Bar","Lounge","Drink","Bar"],                                     gradient: "from-purple-600 to-indigo-500", icon: Wine,            photo: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=200&q=80" },
  { label: "Rooftop",        types: ["Rooftop Bar","Rooftop Lounge","Rooftop Restaurant","Sky Bar","Rooftop"],                                            gradient: "from-sky-400 to-blue-600",      icon: Building2,       photo: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=200&q=80" },
  { label: "Nightlife",      types: ["Dance Club","Live Music Club","Jazz Club","Comedy Club","Karaoke Bar","Nightlife"],                                  gradient: "from-fuchsia-600 to-pink-600",  icon: Music,           photo: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=200&q=80" },
  { label: "Arts & Culture", types: ["Museum","Art Gallery","Live Theater","Performance Space","Cultural","Arts","Culture","Gallery","Art"],               gradient: "from-rose-500 to-red-500",      icon: Palette,         photo: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=200&q=80" },
  { label: "Activities",     types: ["Escape Room","Cooking Class","Paint & Sip","Board Game Cafe","Activity","Activities","Entertainment","Experience"],  gradient: "from-green-500 to-emerald-500", icon: Zap,             photo: "https://images.unsplash.com/photo-1525177089949-b1488a0ea5b6?auto=format&fit=crop&w=200&q=80" },
  { label: "Wellness",       types: ["Spa","Yoga Studio","Meditation Center","Fitness Studio","Wellness","Health","Fitness"],                              gradient: "from-teal-400 to-cyan-500",     icon: Leaf,            photo: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=200&q=80" },
  { label: "Outdoors",       types: ["Public Park","Botanical Garden","Beach","Skate Park","Outdoor","Outdoors","Park","Nature"],                          gradient: "from-lime-500 to-green-600",    icon: TreePine,        photo: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=200&q=80" },
];


type NeighborhoodMap = Record<string, string[]>;

// ─── Filter helpers ───────────────────────────────────────────────────────────

function extractNeighborhoods(experiences: Experience[]): NeighborhoodMap {
  const map: Record<string, Set<string>> = {};
  for (const exp of experiences) {
    for (const place of exp.places_id ?? []) {
      const borough = (place.borough ?? "").trim();
      const neighborhood = (place.neighborhood ?? "").trim();
      if (!VALID_BOROUGHS.has(borough) || !neighborhood || neighborhood.toLowerCase() === "unknown" || neighborhood.length > 40) continue;
      (map[borough] ??= new Set()).add(neighborhood);
    }
  }
  const result: NeighborhoodMap = {};
  for (const [borough, hoods] of Object.entries(map)) result[borough] = [...hoods].sort((a, b) => a.localeCompare(b));
  return result;
}

function parseMaxBudget(b: string): number {
  if (b === "NA" || !b) return 0;
  const nums = b.match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : 0;
}

function budgetMatches(expBudgets: string[], budget: string): boolean {
  if (!budget) return true;
  if (!expBudgets?.length) return true;
  const paid = expBudgets.filter((b) => b !== "NA");
  const max = paid.length > 0 ? Math.max(...paid.map(parseMaxBudget)) : 0;
  if (budget === "Free") return paid.length === 0 || max <= 10;
  if (budget === "$")    return max <= 30;
  if (budget === "$$")   return max > 20 && max <= 75;
  if (budget === "$$$")  return max > 50;
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
    return selectedNeighborhoods.some((n) => {
      const needle = n.toLowerCase();
      const all = [
        ...(exp.neighborhoods ?? []).map((x) => x.toLowerCase()),
        ...places.map((p) => (p.neighborhood ?? "").toLowerCase()),
      ];
      return all.some((x) => x.includes(needle) || needle.includes(x));
    });
  }
  return places.some((p) => p.borough === borough);
}

function filterExperiences(all: Experience[], { borough, selectedNeighborhoods, budgets, settings, venueTypes, quickVibeTypes }: { borough: string; selectedNeighborhoods: string[]; budgets: string[]; settings: string[]; venueTypes: string[]; quickVibeTypes: string[] }) {
  // Combine quick vibe + venue type into one OR pool
  const combinedTypes = [...new Set([...quickVibeTypes, ...venueTypes])];
  return all.filter((exp) => {
    if (!locationMatches(exp, borough, selectedNeighborhoods)) return false;
    if (budgets.length > 0 && !budgets.some((b) => budgetMatches(exp.budget ?? [], b))) return false;
    if (!settingMatches(exp.indoor_outdoor ?? [], settings)) return false;
    if (!venueTypeMatches(exp, combinedTypes)) return false;
    return true;
  });
}

function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
  setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
}

function getExpImage(exp: Experience): string | null {
  for (const p of exp.places_id ?? []) {
    const url =
      (p.display_images ?? []).find((img) => img.url)?.url ??
      (p.images ?? []).find((img) => img.url)?.url;
    if (url) return url;
  }
  return null;
}

// ─── Map ──────────────────────────────────────────────────────────────────────

const PlanBackgroundMap = dynamic(
  () => import("./plan-map").then((m) => m.PlanMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100" /> }
);

// ─── Page ─────────────────────────────────────────────────────────────────────

function PlanPageInner() {
  const searchParams = useSearchParams();
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [location, setLocation] = useState("All NYC");
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<string[]>([]);
  const [settings, setSettings] = useState<string[]>([]);
  const [venueTypes, setVenueTypes] = useState<string[]>([]);
  const [quickVibeTypes, setQuickVibeTypes] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<Experience[] | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outsideNYC, setOutsideNYC] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodMap>({});
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [previewExperience, setPreviewExperience] = useState<Experience | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const currentCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  // Filters drawer drag-to-dismiss
  const filtersDragStartY = useRef<number | null>(null);
  const [filtersDragY, setFiltersDragY] = useState(0);
  const resetExploreRef = useRef<() => void>(() => {});

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

  // Pre-load experiences from a collection via ?collection_id=123
  useEffect(() => {
    const collectionId = searchParams.get("collection_id");
    if (!collectionId) return;
    fetch(`/api/collections/${collectionId}`)
      .then((r) => r.json())
      .then((col) => {
        const exps: Experience[] = col._experiences ?? [];
        if (exps.length > 0) setResults(exps);
      })
      .catch(() => {});
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // matchedExperiences = all when no filters active, filtered subset otherwise
  const matchedExperiences = useMemo(
    () => filterExperiences(allExperiences, { borough: location, selectedNeighborhoods, budgets, settings, venueTypes, quickVibeTypes }),
    [allExperiences, location, selectedNeighborhoods, budgets, settings, venueTypes, quickVibeTypes]
  );

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
    const allSelected = types.every((t) => quickVibeTypes.includes(t));
    setQuickVibeTypes(allSelected ? quickVibeTypes.filter((t) => !types.includes(t)) : [...new Set([...quickVibeTypes, ...types])]);
  }

  function handleVenueGrid(types: string[]) {
    const allSelected = types.every((t) => venueTypes.includes(t));
    setVenueTypes(allSelected ? venueTypes.filter((t) => !types.includes(t)) : [...new Set([...venueTypes, ...types])]);
  }

  const handlePinClick = useCallback((exp: Experience) => {
    setPreviewExperience(exp);
  }, []);

  async function handleSearch() {
    setLoading(true);
    setFallbackMessage(null);
    setPreviewExperience(null);
    try {
      const res = await fetch(`${API_BASE}/discovery`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const all: Experience[] = Object.values(
        (data as { experiences: Record<string, Experience[]> }).experiences
      ).flat();
      const filters = { borough: location, selectedNeighborhoods, budgets, settings, venueTypes, quickVibeTypes };
      let matched = filterExperiences(all, filters);
      if (matched.length === 0 && (selectedNeighborhoods.length || budgets.length || settings.length || venueTypes.length || quickVibeTypes.length)) {
        const relaxations = [
          { label: `${location} (any neighborhood)`, overrides: { selectedNeighborhoods: [] } },
          { label: `${location} (any vibe)`,          overrides: { venueTypes: [], quickVibeTypes: [] } },
          { label: `${location} (any budget)`,        overrides: { budgets: [] } },
          { label: `${location} (indoor & outdoor)`,  overrides: { settings: [] } },
          { label: "all of NYC",                       overrides: { borough: "All NYC", selectedNeighborhoods: [], budgets: [], settings: [], venueTypes: [], quickVibeTypes: [] } },
        ];
        for (const { label, overrides } of relaxations) {
          const relaxed = filterExperiences(all, { ...filters, ...overrides });
          if (relaxed.length > 0) { matched = relaxed; setFallbackMessage(`No exact matches — showing experiences in ${label} instead.`); break; }
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

  function resetExplore() {
    setSelectedExperience(null);
    setVenueTypes([]);
    setQuickVibeTypes([]);
    setBudgets([]);
    setSettings([]);
    setLocation("All NYC");
    setSelectedNeighborhoods([]);
    setResults(null);
    setResultsOpen(false);
    setPreviewExperience(null);
    setFallbackMessage(null);
  }

  // Keep ref current so the event listener always calls the latest version
  resetExploreRef.current = resetExplore;

  // Listen for bottom-nav Explore tab taps to reset page state
  useEffect(() => {
    const handler = () => resetExploreRef.current();
    window.addEventListener("explore-tab-clicked", handler);
    return () => window.removeEventListener("explore-tab-clicked", handler);
  }, []);

  if (selectedExperience) {
    return (
      <ExperienceDetail
        experience={selectedExperience}
        onBack={() => setSelectedExperience(null)}
      />
    );
  }

  // Actual bottom bar height: pt-3(12) + text(20) + gap(8) + button(50) + pb-3(12) + paddingBottom(68+safe) = 170+safe
  const BOTTOM_BAR_H = "calc(env(safe-area-inset-bottom, 0px) + 174px)";

  return (
    <div className="fixed inset-0 overflow-hidden">

      {/* ── Map ── */}
      <div className="absolute inset-0 z-0">
        <PlanBackgroundMap
          experiences={results ? results : matchedExperiences}
          onExperienceClick={handlePinClick}
        />
      </div>

      {/* ── Title ── */}
      <div
        className="absolute left-0 right-0 z-10 flex flex-col items-center pointer-events-none"
        style={{ top: "calc(env(safe-area-inset-top, 44px) + 10px)" }}
      >
        <h1 className="text-2xl font-bold text-gray-900" style={{ textShadow: "0 1px 6px rgba(255,255,255,0.9)" }}>Explore</h1>
        <p className="text-sm text-gray-600 mt-0.5" style={{ textShadow: "0 1px 4px rgba(255,255,255,0.9)" }}>Find the perfect match</p>
      </div>

      {/* ── Content overlay — bottom half ── */}
      <div
        className="absolute left-0 right-0 z-20 flex flex-col justify-end pointer-events-none"
        style={{ top: "50dvh", bottom: BOTTOM_BAR_H }}
      >
        {/* Quick Vibe */}
        <div className="px-4 mb-4 pointer-events-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "rgba(0,0,0,0.75)", textShadow: "0 1px 3px rgba(255,255,255,0.8)" }}>
            Quick Vibe
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {QUICK_VIBES.map((vibe) => {
              const active = vibe.types.every((t) => quickVibeTypes.includes(t));
              return (
                <button key={vibe.label} type="button" onClick={() => handleQuickVibe(vibe.types)}
                  className="flex-shrink-0">
                  <div className="w-[68px] h-[68px] rounded-full overflow-hidden relative"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                    <Image src={vibe.photo} fill alt={vibe.label} className="object-cover" sizes="68px" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-[10px] font-semibold text-center leading-tight px-2">{vibe.label}</span>
                    </div>
                    {/* Border overlay on top of all content so it's always visible */}
                    <div className="absolute inset-0 rounded-full pointer-events-none transition-all"
                      style={{ boxShadow: active ? "inset 0 0 0 3px #FF9A56" : "inset 0 0 0 2px rgba(255,255,255,0.5)" }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* What's the Vibe */}
        <div className="px-4 mb-3 pointer-events-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "rgba(0,0,0,0.75)", textShadow: "0 1px 3px rgba(255,255,255,0.8)" }}>
            What&apos;s the Vibe
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {VENUE_GRID.map(({ label, types, gradient, icon: Icon, photo }) => {
              const active = types.some((t) => venueTypes.includes(t));
              return (
                <button key={label} type="button" onClick={() => handleVenueGrid(types)}
                  className="relative flex-shrink-0 w-[100px] h-[100px] rounded-2xl overflow-hidden transition-all"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                  <Image src={photo} fill alt={label} className="object-cover" sizes="100px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <Icon className="absolute top-2 right-2 w-4 h-4 text-white/80" strokeWidth={1.5} />
                  <span className="absolute bottom-2 left-2 text-white text-[11px] font-semibold leading-tight">{label}</span>
                  {/* Border overlay on top of all content so it's always visible */}
                  <div className="absolute inset-0 rounded-2xl pointer-events-none transition-all"
                    style={{ boxShadow: active ? "inset 0 0 0 3px #FF9A56" : "none" }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Pin preview card ── */}
      {previewExperience && (
        <div
          className="fixed left-4 right-4 z-35 pointer-events-auto"
          style={{ bottom: BOTTOM_BAR_H }}
        >
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex gap-3 p-3 mb-2">
            {(() => {
              const imgUrl = getExpImage(previewExperience);
              return imgUrl ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0">
                  <Image src={imgUrl} fill alt={previewExperience.title} className="object-cover" sizes="64px" />
                </div>
              ) : null;
            })()}
            <button
              className="flex-1 text-left min-w-0"
              onClick={() => setSelectedExperience(previewExperience)}
            >
              <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{previewExperience.title}</p>
              {previewExperience.neighborhoods?.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{previewExperience.neighborhoods[0]}</p>
              )}
              <p className="text-xs text-[#FB6983] font-medium mt-1">View details →</p>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewExperience(null); }}
              className="p-1 text-gray-300 shrink-0 self-start"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Filters button ── */}
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="fixed z-40 flex items-center gap-1.5 bg-white rounded-full px-4 py-2.5 shadow-lg text-sm font-medium text-gray-800"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 178px)", right: "16px" }}
      >
        <SlidersHorizontal className="w-4 h-4" strokeWidth={1.8} />
        Filters
      </button>

      {/* ── Bottom bar ── */}
      <div
        className="fixed left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-100"
        style={{ bottom: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)" }}
      >
        <div className="px-4 pt-3 pb-3 flex flex-col gap-2">
          <p className="text-xs text-gray-400 text-center">
            {allExperiences.length === 0 ? "Loading…" : `Experiences found: ${matchedExperiences.length}`}
          </p>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || allExperiences.length === 0}
            className="w-full bg-[#FB6983] text-white font-bold text-sm rounded-full py-3.5 disabled:opacity-60 active:opacity-80 transition-opacity"
          >
            {loading ? "Finding…" : "Explore experiences"}
          </button>
        </div>
      </div>

      {/* ── Filters Drawer ── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setFiltersOpen(false); setFiltersDragY(0); }} />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-y-auto transition-transform"
            style={{ maxHeight: "85dvh", transform: `translateY(${filtersDragY}px)` }}
            onTouchStart={(e) => { filtersDragStartY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => {
              if (filtersDragStartY.current === null) return;
              const delta = e.touches[0].clientY - filtersDragStartY.current;
              if (delta > 0) setFiltersDragY(delta);
            }}
            onTouchEnd={() => {
              if (filtersDragY > 80) { setFiltersOpen(false); }
              setFiltersDragY(0);
              filtersDragStartY.current = null;
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pt-1 pb-2 sticky top-0 bg-white z-10 border-b border-gray-50">
              <p className="text-base font-semibold text-gray-900">Filters</p>
              <button type="button" onClick={() => { setFiltersOpen(false); setFiltersDragY(0); }} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 pt-4 flex flex-col gap-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
              {/* Location */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Location</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleCurrentLocation}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${location === "__current__" ? "bg-[#FB6983] text-white" : "bg-[#f2f4f7] text-[#1d2939]"}`}>
                    <MapPin className="w-3.5 h-3.5" strokeWidth={2} />Current Location
                  </button>
                  {BOROUGHS.map((loc) => (
                    <button type="button" key={loc} onClick={() => handleSelectLocation(loc)}
                      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${location === loc ? "bg-[#FB6983] text-white" : "bg-[#f2f4f7] text-[#1d2939]"}`}>
                      {loc}
                    </button>
                  ))}
                </div>
                {outsideNYC && (
                  <div className="mt-3 rounded-2xl border border-[#FF9A56] px-4 py-4 relative">
                    <button onClick={() => setOutsideNYC(false)} className="absolute top-3 right-3 text-gray-400"><X className="w-4 h-4" /></button>
                    <p className="text-sm font-medium text-[#101828]">We&apos;re not in your area yet</p>
                    <p className="text-xs text-[#667085] leading-relaxed mt-1">We&apos;re currently in NYC and expanding soon.</p>
                    <a href="mailto:hello@limelii.com?subject=Notify me when Limelii launches near me" className="mt-2 inline-block bg-black text-white text-xs font-medium rounded-full px-4 py-2">Notify me</a>
                  </div>
                )}
                {neighborhoodOptions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Neighborhood</p>
                    <div className="flex flex-wrap gap-2">
                      {neighborhoodOptions.map((n) => (
                        <button type="button" key={n} onClick={() => toggleItem(selectedNeighborhoods, setSelectedNeighborhoods, n)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedNeighborhoods.includes(n) ? "bg-[#FF9A56] text-white" : "bg-[#f2f4f7] text-[#1d2939]"}`}>
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
                    <button type="button" key={b} onClick={() => toggleItem(budgets, setBudgets, b)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${budgets.includes(b) ? "bg-[#FF9A56] text-white" : "bg-[#f2f4f7] text-[#1d2939]"}`}>
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
                    <button type="button" key={s} onClick={() => toggleItem(settings, setSettings, s)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${settings.includes(s) ? "bg-[#FB6983] text-white" : "bg-[#f2f4f7] text-[#1d2939]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setFiltersOpen(false)}
                className="w-full bg-gray-900 text-white font-semibold rounded-full py-3.5 text-sm">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Results Panel ── */}
      {resultsOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100 shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 44px) + 12px)" }}>
            <button type="button" onClick={() => setResultsOpen(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            <p className="font-semibold text-gray-900 text-base">{results?.length ?? 0} experiences</p>
          </div>
          {fallbackMessage && (
            <div className="px-4 py-2 bg-orange-50 shrink-0">
              <p className="text-xs text-orange-600">{fallbackMessage}</p>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 pt-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
            {results && results.length > 0 ? (
              // Two independent flex columns so cards flow without row-aligned gaps
              <div className="flex gap-1 items-start">
                {[results.filter((_, i) => i % 2 === 0), results.filter((_, i) => i % 2 === 1)].map((col, colIdx) => (
                  <div key={colIdx} className="flex-1 flex flex-col gap-1">
                    {col.map((exp, rowIdx) => {
                      // Left col: tall/short/tall… Right col: short/tall/short…
                      const isTall = colIdx === 0 ? rowIdx % 2 === 0 : rowIdx % 2 === 1;
                      return (
                        <ExperienceCard
                          key={exp.id}
                          experience={exp}
                          onClick={() => setSelectedExperience(exp)}
                          compact
                          className={`!aspect-auto !rounded-xl ${isTall ? "h-[220px]" : "h-[188px]"}`}
                        />
                      );
                    })}
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

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="bg-white min-h-screen" />}>
      <PlanPageInner />
    </Suspense>
  );
}
