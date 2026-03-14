"use client";

import { useState, useEffect } from "react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import type { Experience } from "@/app/page";

const SAVED_ITEMS_KEY = "limelii_saved_items";

function getSavedExperiences(): Experience[] {
  if (typeof window === "undefined") return [];
  try {
    const items = JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY) ?? "{}");
    return Object.values(items) as Experience[];
  } catch {
    return [];
  }
}

export default function SavedPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [selected, setSelected] = useState<Experience | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setExperiences(getSavedExperiences());
    setMounted(true);
  }, []);

  // Re-sync when returning from detail (user may have unsaved)
  function handleBack() {
    setSelected(null);
    setExperiences(getSavedExperiences());
  }

  if (selected) {
    return <ExperienceDetail experience={selected} onBack={handleBack} />;
  }

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[44px]" />
      <div className="px-5 pt-4 pb-6">
        <h1 className="text-[#101828] text-[2.25rem] font-bold leading-tight">Saved</h1>
        <p className="text-[#667085] text-sm mt-2">Experiences you&apos;ve saved for later.</p>
      </div>

      {mounted && experiences.length === 0 && (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-[#101828] font-semibold text-base">Nothing saved yet</p>
          <p className="text-[#667085] text-sm">
            Tap &ldquo;Save idea&rdquo; on any experience to add it here.
          </p>
        </div>
      )}

      {experiences.length > 0 && (
        <div className="px-5 flex flex-col gap-4 pb-28">
          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onClick={() => setSelected(exp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
