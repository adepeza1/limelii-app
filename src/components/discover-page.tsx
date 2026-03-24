"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, ArrowLeft, X } from "lucide-react";
import Image from "next/image";
import type {
  DiscoveryResponse,
  Experience,
  ExperienceCategory,
} from "@/app/page";
import { ExperienceCard } from "./experience-card";
import { ExperienceDetail } from "./experience-detail";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

/** Convert snake_case keys to readable titles */
function formatSectionTitle(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Maps curated category names to activity tag values returned by the API
const CATEGORY_ACTIVITY_MAP: Record<string, string[]> = {
  "Food & Drink":   ["food", "drink", "drinks"],
  "Nightlife":      ["nightlife", "entertainment"],
  "Arts & Culture": ["cultural", "museum"],
  "Outdoors":       ["outdoor activity", "recreation activity", "specialty activity"],
  "Wellness":       ["wellness"],
  "Live Music":     ["entertainment", "nightlife"],
};

const CURATED_CATEGORIES: ExperienceCategory[] = [
  { id: 0, name: "All" },
  { id: 1, name: "Food & Drink" },
  { id: 2, name: "Nightlife" },
  { id: 3, name: "Date Night" },
  { id: 4, name: "Arts & Culture" },
  { id: 5, name: "Outdoors" },
  { id: 6, name: "Wellness" },
  { id: 7, name: "Live Music" },
];

export function DiscoverPage({ data }: { data: DiscoveryResponse }) {
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [sections, setSections] = useState<Record<string, Experience[]>>(
    data.experiences
  );
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [outsideNYC, setOutsideNYC] = useState(false);

  // Check if user is within NYC bounds
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const inNYC =
          lat >= 40.4774 && lat <= 40.9176 &&
          lng >= -74.2591 && lng <= -73.7004;
        if (!inNYC) setOutsideNYC(true);
      },
      () => { /* permission denied or unavailable — show content */ },
      { timeout: 10000 }
    );
  }, []);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Experience[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allExperiences = Object.values(data.experiences).flat();

  function filterByCategory(categoryId: number): Record<string, Experience[]> {
    if (categoryId === 0) return data.experiences;
    const catName = CURATED_CATEGORIES.find((c) => c.id === categoryId)?.name;
    if (!catName) return data.experiences;

    if (catName === "Date Night") {
      const filtered = allExperiences.filter((exp) => {
        const acts = (exp.activities ?? []).map((a) => a.toLowerCase());
        const hasFood = acts.some((a) => ["food", "drink", "drinks"].includes(a));
        const hasNightlife = acts.some((a) => ["nightlife", "entertainment"].includes(a));
        return hasFood && hasNightlife;
      });
      return { "Date Night": filtered };
    }

    const keywords = CATEGORY_ACTIVITY_MAP[catName];
    if (!keywords) return data.experiences;

    const filtered = allExperiences.filter((exp) =>
      (exp.activities ?? []).some((a) => keywords.includes(a.toLowerCase()))
    );
    return { [catName]: filtered };
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
        onBack={() => setSelectedExperience(null)}
      />
    );
  }

  if (outsideNYC) {
    return (
      <div className="bg-white min-h-screen max-w-5xl mx-auto flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-6 text-5xl">🌍</div>
        <h2 className="text-xl font-semibold text-black mb-2">We&apos;re not in your area yet</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          We&apos;re currently available in New York City and expanding soon. Get notified when we launch near you.
        </p>
        <a
          href="mailto:hello@limelii.com?subject=Notify me when Limelii launches near me"
          className="w-full max-w-xs bg-black text-white text-sm font-medium rounded-2xl py-3.5 text-center block"
        >
          Notify me when you&apos;re nearby
        </a>
      </div>
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
                className="w-full bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#416f7b]/30"
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
              <button aria-label="Notifications">
                <Bell className="w-6 h-6 text-gray-900" strokeWidth={1.8} />
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
                  onClick={() => setSelectedExperience(exp)}
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
              Explore the best things to do in NYC — curated by vibe, neighborhood, and occasion.
            </p>
          </div>

          {/* Category Navigation */}
          <nav className="px-4 py-3">
            <div className="flex gap-6 overflow-x-auto hide-scrollbar">
              {CURATED_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`shrink-0 text-sm font-medium pb-2 relative transition-colors ${
                    activeCategory === cat.id ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {cat.name}
                  {activeCategory === cat.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-900 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Content Sections */}
          <main className="pb-8">
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
                    <ExperienceCard key={exp.id} experience={exp} onClick={() => setSelectedExperience(exp)} />
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
