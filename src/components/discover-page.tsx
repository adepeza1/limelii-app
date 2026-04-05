"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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

import { API_BASE } from "@/lib/xano";

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

/** Convert snake_case keys to readable titles */
function formatSectionTitle(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function DiscoverPage({ data }: { data: DiscoveryResponse }) {
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [sections, setSections] = useState<Record<string, Experience[]>>(
    data.experiences
  );
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const savedScrollY = useRef(0);

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
  const [searchLoading, setSearchLoading] = useState(false);
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

  function filterByCategory(categoryId: number): Record<string, Experience[]> {
    if (categoryId === 0) return data.experiences;

    // Filter each section to only experiences matching this category_id
    const result: Record<string, Experience[]> = {};
    for (const [key, exps] of Object.entries(data.experiences)) {
      const matching = exps.filter((exp) => exp.category_id === categoryId);
      if (matching.length > 0) result[key] = matching;
    }
    return result;
  }

  function handleCategoryChange(categoryId: number) {
    setActiveCategory(categoryId);
    setSections(filterByCategory(categoryId));
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

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length === 0) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/search_keyword?search_term=${encodeURIComponent(value.trim())}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data: { experiences: Experience[] } = await res.json();
        setSearchResults(data.experiences);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
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
    <div className="bg-white min-h-screen max-w-5xl mx-auto relative">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-white">
        <div className="h-[44px]" />
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
          {searchLoading && (
            <div className="px-4 pt-4 flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-full aspect-[33/38] rounded-[20px] bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          )}

          {!searchLoading && searchQuery.trim() && searchResults && searchResults.length === 0 && (
            <p className="text-center text-gray-500 py-12 text-sm">
              No experiences found for &ldquo;{searchQuery}&rdquo;
            </p>
          )}

          {!searchLoading && searchResults && searchResults.length > 0 && (
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

          {!searchLoading && !searchQuery.trim() && (
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
                      ? "text-[#E8405A] border-b-2 border-[#E8405A]"
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
