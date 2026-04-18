"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import Link from "next/link";
import { Search, ArrowLeft, X } from "lucide-react";
import Image from "next/image";
import type {
  DiscoveryResponse,
  Experience,
  ExperienceCategory,
} from "@/app/page";
import { ExperienceCard } from "./experience-card";
import { ExperienceDetail } from "./experience-detail";


// ─── Suggestion logic ─────────────────────────────────────────────────────────

const PREFS_KEY = "limelii_preferences";

interface StoredPrefs {
  borough?: string;
  neighborhood?: string;
  groupType?: string;
  interests?: string[];
}

const INTEREST_TYPES: Record<string, string[]> = {
  "Food & Drink":    ["Food", "Restaurant", "Dining", "Fine Dining", "Casual Dining", "Fast Casual", "Food Hall", "Food Truck", "Cafe", "Coffee", "Traditional Cafe", "Specialty Coffee"],
  "Nightlife":       ["Nightlife", "Bar", "Cocktail Bar", "Wine Bar", "Beer Bar", "Dive Bar", "Lounge", "Dance Club", "Live Music Club", "Jazz Club", "Comedy Club", "Karaoke Bar"],
  "Arts & Culture":  ["Museum", "Art Gallery", "Art", "Gallery", "Live Theater", "Performance Space", "Cultural", "Culture", "Arts"],
  "Outdoors":        ["Park", "Outdoor", "Outdoors", "Garden", "Beach", "Botanical Garden", "Public Park", "Nature", "Skate Park"],
  "Music":           ["Live Music", "Jazz Club", "Live Music Club", "Music", "Concert"],
  "Sports":          ["Sports", "Fitness", "Gym", "Activity", "Activities"],
  "Wellness":        ["Spa", "Yoga", "Yoga Studio", "Meditation", "Wellness", "Health", "Fitness Studio"],
  "Shopping":        ["Shopping", "Market", "Boutique", "Retail"],
  "Comedy":          ["Comedy", "Comedy Club"],
  "Film":            ["Film", "Cinema", "Movie"],
  "Architecture":    ["Architecture", "Historic", "Landmark"],
  "History":         ["History", "Historic", "Museum", "Cultural", "Landmark"],
  "Family-friendly": ["Family", "Activity", "Activities", "Park", "Museum", "Outdoor"],
  "Dog-friendly":    ["Park", "Outdoor", "Outdoors", "Dog", "Beach"],
};

function scoreExperience(exp: Experience, prefs: StoredPrefs): number {
  let score = 0;
  const expTypes = (exp.places_id ?? []).flatMap(p => p._location_details?.location_type ?? []).map(t => t.toLowerCase());
  const expActivities = (exp.activities ?? []).map(a => a.toLowerCase());

  for (const interest of prefs.interests ?? []) {
    const types = (INTEREST_TYPES[interest] ?? []).map(t => t.toLowerCase());
    if (types.some(t => expTypes.some(et => et.includes(t) || t.includes(et)))) score += 3;
    else if (types.some(t => expActivities.some(a => a.includes(t) || t.includes(a)))) score += 2;
    else if (types.some(t => (exp.title + " " + exp.description).toLowerCase().includes(t))) score += 1;
  }

  const borough = prefs.borough;
  if (borough && borough !== "All NYC") {
    if ((exp.places_id ?? []).some(p => p.borough === borough)) score += 2;
    const hood = prefs.neighborhood;
    if (hood) {
      const inHood = (exp.places_id ?? []).some(p => p.neighborhood?.toLowerCase() === hood.toLowerCase())
        || (exp.neighborhoods ?? []).some(n => n.toLowerCase() === hood.toLowerCase());
      if (inHood) score += 3;
    }
  }

  return score;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Convert snake_case keys to readable titles */
function formatSectionTitle(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function DiscoverPage({ data }: { data: DiscoveryResponse }) {
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [baseSections, setBaseSections] = useState<Record<string, Experience[]>>(data.experiences);
  const [sections, setSections] = useState<Record<string, Experience[]>>(data.experiences);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const savedScrollY = useRef(0);

  // Pull-to-refresh
  const PULL_THRESHOLD = 65;
  const PULL_MAX = 80;
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const ptrStartY = useRef(0);
  const ptrStartX = useRef(0);
  const ptrActive = useRef(false);
  const ptrHapticFired = useRef(false);

  function openExperience(exp: Experience) {
    savedScrollY.current = window.scrollY;
    setSelectedExperience(exp);
  }

  function closeExperience() {
    setSelectedExperience(null);
    requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
  }

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Experience[] | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allExperiences = useMemo(() => Object.values(data.experiences).flat(), [data.experiences]);

  // ── Suggested for you ───────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<Experience[]>([]);
  const [prefsChecked, setPrefsChecked] = useState(false);

  useEffect(() => {
    try {
      const prefs: StoredPrefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") ?? {};
      if (!prefs.interests?.length && (!prefs.borough || prefs.borough === "All NYC")) {
        setPrefsChecked(true);
        return;
      }
      const scored = allExperiences
        .map(exp => ({ exp, score: scoreExperience(exp, prefs) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ exp }) => exp);
      setSuggestions(scored);
    } catch {
      // localStorage unavailable
    }
    setPrefsChecked(true);
  }, [allExperiences]);

  const categories: ExperienceCategory[] = [
    { id: 0, name: "All" },
    ...[...data.experience_categories].sort((a, b) => a.id - b.id),
  ];

  function filterByCategory(categoryId: number, base: Record<string, Experience[]>): Record<string, Experience[]> {
    if (categoryId === 0) return base;
    const result: Record<string, Experience[]> = {};
    for (const [key, exps] of Object.entries(base)) {
      const matching = exps.filter((exp) => exp.category_id === categoryId);
      if (matching.length > 0) result[key] = matching;
    }
    return result;
  }

  function handleCategoryChange(categoryId: number) {
    setActiveCategory(categoryId);
    setSections(filterByCategory(categoryId, baseSections));
  }

  const doRefresh = useCallback(() => {
    const shuffled: Record<string, Experience[]> = {};
    for (const [key, exps] of Object.entries(data.experiences)) {
      shuffled[key] = shuffle(exps);
    }
    setBaseSections(shuffled);
    setSections(filterByCategory(activeCategory, shuffled));
    setTimeout(() => setRefreshing(false), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  function onPTRTouchStart(e: React.TouchEvent) {
    if (window.scrollY > 0 || refreshing) return;
    ptrStartY.current = e.touches[0].clientY;
    ptrStartX.current = e.touches[0].clientX;
    ptrActive.current = false;
    ptrHapticFired.current = false;
  }

  function onPTRTouchMove(e: React.TouchEvent) {
    if (refreshing || window.scrollY > 0) return;
    const dy = e.touches[0].clientY - ptrStartY.current;
    const dx = Math.abs(e.touches[0].clientX - ptrStartX.current);
    if (!ptrActive.current) {
      if (dy > 8 && dy > dx * 1.5) ptrActive.current = true;
      else return;
    }
    if (dy > 0) {
      const next = Math.min(dy * 0.45, PULL_MAX);
      if (!ptrHapticFired.current && next >= PULL_THRESHOLD) {
        haptic("medium");
        ptrHapticFired.current = true;
      }
      setPullY(next);
    }
  }

  function onPTRTouchEnd() {
    ptrActive.current = false;
    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullY(0);
      doRefresh();
    } else {
      setPullY(0);
    }
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  function searchExperiences(query: string): Experience[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return allExperiences.filter((exp) => {
      if (exp.title?.toLowerCase().includes(q)) return true;
      if (exp.description?.toLowerCase().includes(q)) return true;
      for (const act of exp.activities ?? []) {
        if (act.toLowerCase().includes(q)) return true;
      }
      for (const n of exp.neighborhoods ?? []) {
        if (n.toLowerCase().includes(q)) return true;
      }
      for (const place of exp.places_id ?? []) {
        if (place.name?.toLowerCase().includes(q)) return true;
        if (place.neighborhood?.toLowerCase().includes(q)) return true;
        if (place.borough?.toLowerCase().includes(q)) return true;
        for (const t of place._location_details?.location_type ?? []) {
          if (t.toLowerCase().includes(q)) return true;
        }
        if (place._location_details?.Description?.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchResults(searchExperiences(value));
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const nonEmptySections = Object.entries(sections).filter(
    ([, exps]) => exps.length > 0
  );

  if (selectedExperience) {
    return (
      <ExperienceDetail
        experience={selectedExperience}
        onBack={closeExperience}
      />
    );
  }

  return (
    <div
      className="bg-white min-h-screen max-w-5xl mx-auto relative"
      onTouchStart={onPTRTouchStart}
      onTouchMove={onPTRTouchMove}
      onTouchEnd={onPTRTouchEnd}
    >
      <div className="h-[env(safe-area-inset-top,44px)]" />

      {/* Pull-to-refresh indicator */}
      <div
        className="overflow-hidden flex items-center justify-center gap-2"
        style={{
          height: refreshing ? 52 : pullY,
          transition: pullY === 0 ? "height 0.2s ease-out" : "none",
        }}
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-[#FB6983]/30"
          style={{
            borderTopColor: "#FB6983",
            animation: refreshing || pullY >= PULL_THRESHOLD ? "spin 0.75s linear infinite" : "none",
          }}
        />
        <span className="text-xs text-[#98A2B3]">
          {refreshing ? "Refreshing…" : pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-white">
        {searchOpen ? (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
            <button onClick={closeSearch} aria-label="Close search">
              <ArrowLeft className="w-6 h-6 text-gray-900" strokeWidth={1.8} />
            </button>
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search experiences..."
                className="w-full bg-gray-100 rounded-lg px-4 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#416f7b]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <Image src="/limelii-logo.svg" alt="Limelii" width={80} height={28} priority />
            <div className="flex items-center gap-4">
              <button onClick={openSearch} aria-label="Search">
                <Search className="w-6 h-6 text-gray-900" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
      </header>

      {searchOpen ? (
        /* Search Results */
        <main className="pb-8">
          {searchQuery.trim() && searchResults && searchResults.length === 0 && (
            <p className="text-center text-gray-500 py-12 text-sm">
              No experiences found for &ldquo;{searchQuery}&rdquo;
            </p>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="px-4 pt-4 flex flex-col gap-4">
              {searchResults.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  experience={exp}
                  onClick={() => openExperience(exp)}
                />
              ))}
            </div>
          )}

          {!searchQuery.trim() && (
            <p className="text-center text-gray-400 py-12 text-sm">
              Type to search experiences
            </p>
          )}
        </main>
      ) : (
        <>
          {/* Page Description */}
          <div className="px-4 pt-4 pb-1">
            <p className="text-sm text-gray-500">
              Explore the best things to do in NYC curated by vibe, neighborhood, and occasion.
            </p>
          </div>

          {/* Category Navigation */}
          <nav className="px-4 py-3">
            <div className="flex gap-6 overflow-x-auto hide-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`shrink-0 text-sm font-medium pb-2 transition-colors ${
                    activeCategory === cat.id
                      ? "text-[#FB6983] border-b-2 border-[#FB6983]"
                      : "text-gray-500"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </nav>

          {/* Content Sections */}
          <main className="pb-8">
            {/* Suggested for you */}
            {activeCategory === 0 && !searchOpen && prefsChecked && (
              <section className="mb-8">
                <h2 className="text-base font-medium text-black px-4 mb-4">✦ Suggested for you</h2>
                {suggestions.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pl-[22px] pr-4">
                    {suggestions.map((exp) => (
                      <ExperienceCard key={exp.id} experience={exp} onClick={() => openExperience(exp)} />
                    ))}
                  </div>
                ) : (
                  <div className="mx-4 px-4 py-5 rounded-2xl bg-[#FFF8F4] border border-[#FF9A56]/20 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 leading-snug">
                      Set your interests to get personalized experiences
                    </p>
                    <Link
                      href="/profile?tab=preferences"
                      className="shrink-0 text-xs font-semibold text-white bg-[#FF9A56] px-3 py-2 rounded-full"
                    >
                      Set up
                    </Link>
                  </div>
                )}
              </section>
            )}

            {nonEmptySections.length === 0 && (
              <p className="text-center text-gray-500 py-12">
                No experiences found for this category.
              </p>
            )}
            {nonEmptySections.map(([key, experiences]) => (
              <section key={key} className="mb-8">
                <h2 className="text-base font-medium text-black px-4 mb-4">
                  {formatSectionTitle(key)}
                </h2>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pl-[22px] pr-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:pl-4 md:overflow-x-visible">
                  {experiences.map((exp) => (
                    <ExperienceCard key={exp.id} experience={exp} onClick={() => openExperience(exp)} />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </>
      )}
    </div>
  );
}
