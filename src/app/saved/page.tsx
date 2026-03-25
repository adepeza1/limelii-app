"use client";

import { useState, useEffect } from "react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import { CollectionsTab } from "@/components/collections-tab";
import type { Experience, DiscoveryResponse } from "@/app/page";
import { API_BASE } from "@/lib/xano";

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

type SavedTab = "saved" | "collections";

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<SavedTab>("saved");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [selected, setSelected] = useState<Experience | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setExperiences(getSavedExperiences());
    setMounted(true);
  }, []);

  // Fetch all experiences for collection ID lookup (lazy, only when switching to Collections tab)
  useEffect(() => {
    if (activeTab !== "collections" || allExperiences.length > 0) return;
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((data: DiscoveryResponse) => {
        const flat = Object.values(data.experiences ?? {}).flat();
        setAllExperiences(flat);
      })
      .catch(() => {/* ignore */});
  }, [activeTab, allExperiences.length]);

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

      {/* Page header */}
      <div className="px-5 pt-4 pb-4">
        <h1 className="text-[#101828] text-[2.25rem] font-bold leading-tight">Saved</h1>
        <p className="text-[#667085] text-sm mt-1">
          {activeTab === "saved"
            ? "Experiences you\u2019ve saved for later."
            : "Your curated collections."}
        </p>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 bg-[#F2F4F7] rounded-xl p-1">
          {(["saved", "collections"] as SavedTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                activeTab === tab
                  ? "bg-white text-[#101828] shadow-sm"
                  : "text-[#667085]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "saved" && (
        <>
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
        </>
      )}

      {activeTab === "collections" && (
        <CollectionsTab allExperiences={allExperiences} />
      )}
    </div>
  );
}
