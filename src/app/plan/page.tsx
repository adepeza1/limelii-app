"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import type { Experience } from "@/app/page";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

const BOROUGHS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const VIBES = [
  "Food & Drink",
  "Nightlife",
  "Wellness",
  "Adventure",
  "Arts & Culture",
  "Date Night",
];

const BUDGETS = ["Free", "$", "$$", "$$$"];

const SETTINGS = ["Any", "Indoor", "Outdoor"];

function SkeletonCard() {
  return (
    <div className="w-full aspect-[33/38] rounded-[20px] bg-gray-100 animate-pulse" />
  );
}

export default function PlanPage() {
  const [location, setLocation] = useState("All NYC");
  const [vibe, setVibe] = useState("");
  const [budget, setBudget] = useState("Free");
  const [setting, setSetting] = useState("Any");

  const [currentLocationLabel, setCurrentLocationLabel] = useState("Current Location");
  const [currentLocationCoords, setCurrentLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [results, setResults] = useState<Experience[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  function fetchCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLocationCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address;
          const neighborhood =
            addr.suburb ||
            addr.neighbourhood ||
            addr.borough ||
            addr.city_district ||
            addr.city ||
            "Near Me";
          setCurrentLocationLabel(neighborhood);
        } catch {
          setCurrentLocationLabel("Near Me");
        }
        setLocation("__current__");
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      }
    );
  }

  function handleSelectLocation(loc: string) {
    if (loc === "__current__") {
      fetchCurrentLocation();
    } else {
      setLocation(loc);
    }
  }

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    setSelectedExperience(null);
    try {
      const body: Record<string, string> = {};

      if (location === "__current__" && currentLocationCoords) {
        body.lat = String(currentLocationCoords.lat);
        body.lng = String(currentLocationCoords.lng);
      } else if (location && location !== "All NYC") {
        body.location = location;
      }

      if (vibe) body.activity = vibe;
      if (budget && budget !== "Free") body.budget = budget;
      if (setting && setting !== "Any") body.indooroutdoor = setting;

      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Search failed");
      const data: Experience[] = await res.json();
      setResults(data);
    } catch {
      setResults([]);
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
    <div className="bg-white min-h-screen max-w-5xl mx-auto relative">
      <div className="h-[44px]" />

      {/* Header */}
      <div className="px-5 pt-4 pb-6">
        <span className="text-[#f78539] font-bold text-xl tracking-tight font-[family-name:var(--font-poppins),sans-serif]">
          limelii
        </span>
        <h1 className="text-[#101828] text-[2.25rem] font-bold leading-tight mt-3">
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
              onClick={() => handleSelectLocation("__current__")}
              disabled={locationLoading}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                location === "__current__"
                  ? "bg-[#416f7b] text-white"
                  : "bg-[#f2f4f7] text-[#1d2939]"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
              {locationLoading ? "Locating..." : currentLocationLabel}
            </button>
            {BOROUGHS.map((loc) => (
              <button
                key={loc}
                onClick={() => handleSelectLocation(loc)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  location === loc
                    ? "bg-[#416f7b] text-white"
                    : "bg-[#f2f4f7] text-[#1d2939]"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Vibe */}
        <div>
          <p className="text-[#667085] text-xs font-semibold uppercase tracking-widest mb-3">
            What kind of vibe?
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {VIBES.map((v) => (
              <button
                key={v}
                onClick={() => setVibe(vibe === v ? "" : v)}
                className={`rounded-2xl py-5 px-3 text-sm font-medium text-center transition-colors ${
                  vibe === v
                    ? "bg-[#416f7b] text-white"
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
                key={b}
                onClick={() => setBudget(b)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  budget === b
                    ? "bg-[#416f7b] text-white"
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
          <div className="flex bg-[#f2f4f7] rounded-full p-1">
            {SETTINGS.map((s) => (
              <button
                key={s}
                onClick={() => setSetting(s)}
                className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  setting === s
                    ? "bg-[#416f7b] text-white"
                    : "text-[#667085]"
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
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-[#416f7b] text-white font-bold text-base rounded-full py-4 flex items-center justify-center gap-3 disabled:opacity-60 active:opacity-80 transition-opacity"
        >
          {loading ? "Finding..." : "Find experiences"}
          {!loading && (
            <span className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="#416f7b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="px-5 flex flex-col gap-4 pb-8">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
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
