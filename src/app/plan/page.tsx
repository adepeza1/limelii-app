"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import type { Experience } from "@/app/page";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

const LOCATIONS = [
  "West Village",
  "East Village",
  "SoHo",
  "Williamsburg",
  "Lower East Side",
  "Chelsea",
  "Greenwich Village",
  "Tribeca",
  "Bushwick",
  "DUMBO",
  "Park Slope",
  "Upper West Side",
  "Upper East Side",
  "Midtown",
  "Harlem",
  "Astoria",
  "Long Island City",
];

const ACTIVITY_TYPES = [
  "Food & Drink",
  "Nightlife",
  "Arts & Culture",
  "Outdoors",
  "Shopping",
  "Wellness",
  "Live Music",
  "Sports & Fitness",
];

const BUDGETS = ["$", "$$", "$$$", "$$$$"];

const INDOOR_OUTDOOR = ["Indoor", "Outdoor", "Both"];

const TIMES_OF_DAY = ["Morning", "Afternoon", "Evening", "Late Night"];

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-[#eaecf0] rounded-xl px-4 py-3.5 pr-10 text-sm text-[#1d2939] placeholder:text-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#416f7b]/30 focus:border-[#416f7b]"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#667085] pointer-events-none" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-full aspect-[33/38] rounded-[20px] bg-gray-100 animate-pulse" />
  );
}

export default function PlanPage() {
  const [location, setLocation] = useState("");
  const [activity, setActivity] = useState("");
  const [budget, setBudget] = useState("");
  const [indoorOutdoor, setIndoorOutdoor] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");

  const [results, setResults] = useState<Experience[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedExperience, setSelectedExperience] =
    useState<Experience | null>(null);

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    setSelectedExperience(null);
    try {
      const body: Record<string, string> = {};
      if (location) body.location = location;
      if (activity) body.activity = activity;
      if (budget) body.budget = budget;
      if (indoorOutdoor) body.indooroutdoor = indoorOutdoor;
      if (timeOfDay) body.time_of_day = timeOfDay;

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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white">
        <div className="h-[44px]" />
        <div className="flex items-center px-4 py-2.5 border-b border-gray-100">
          <h1 className="text-lg font-medium text-black">I want to</h1>
        </div>
      </header>

      {/* Filter Form */}
      <div className="px-4 py-5 flex flex-col gap-3">
        <FilterSelect
          value={location}
          onChange={setLocation}
          placeholder="Select Location"
          options={LOCATIONS}
        />
        <FilterSelect
          value={activity}
          onChange={setActivity}
          placeholder="Select Activity Type"
          options={ACTIVITY_TYPES}
        />
        <FilterSelect
          value={budget}
          onChange={setBudget}
          placeholder="Select Budget"
          options={BUDGETS}
        />
        <FilterSelect
          value={indoorOutdoor}
          onChange={setIndoorOutdoor}
          placeholder="Select Indoor or Outdoor"
          options={INDOOR_OUTDOOR}
        />
        <FilterSelect
          value={timeOfDay}
          onChange={setTimeOfDay}
          placeholder="Select Time of Day"
          options={TIMES_OF_DAY}
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-[#416f7b] text-white font-semibold text-base rounded-xl py-3.5 mt-1 disabled:opacity-60 active:opacity-80 transition-opacity"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="px-4 flex flex-col gap-4 pb-8">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && searched && results && results.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500 text-sm">
            No experiences found. Try adjusting your filters.
          </p>
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <div className="px-4 flex flex-col gap-4 pb-8">
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
