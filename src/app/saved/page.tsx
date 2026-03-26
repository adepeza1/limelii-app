"use client";

import { useState, useEffect, useCallback } from "react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import { CollectionsTab } from "@/components/collections-tab";
import type { Experience, DiscoveryResponse } from "@/app/page";
import type { Collection, SavedCollection } from "@/lib/collections";
import { listCollections } from "@/lib/collections";
import { listSavedExperiences } from "@/lib/saved";
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

function syncToLocalStorage(experiences: Experience[]) {
  try {
    const items: Record<number, Experience> = {};
    for (const exp of experiences) items[exp.id] = exp;
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

type SavedTab = "saved" | "collections";

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<SavedTab>("saved");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [selected, setSelected] = useState<Experience | null>(null);
  const [mounted, setMounted] = useState(false);

  // Collections state lifted here so it survives tab switching
  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [savedCollections, setSavedCollections] = useState<SavedCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Start with localStorage for instant render
    setExperiences(getSavedExperiences());

    // Then sync from server — overwrites localStorage with the authoritative list
    listSavedExperiences()
      .then((records) => {
        if (records.length === 0) return;
        // Fetch discovery data to resolve full experience objects by ID
        return fetch(`${API_BASE}/discovery`)
          .then((r) => r.json())
          .then((data: DiscoveryResponse) => {
            const all = Object.values(data.experiences ?? {}).flat();
            const savedIds = new Set(records.map((r) => r.experience_id));
            const matched = all.filter((e) => savedIds.has(e.id));
            if (matched.length > 0) {
              syncToLocalStorage(matched);
              setExperiences(matched);
            }
          });
      })
      .catch(() => { /* not logged in or network error — localStorage fallback stays */ });
  }, []);

  // Fetch all experiences for collection ID lookup (lazy)
  useEffect(() => {
    if (allExperiences.length > 0) return;
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((data: DiscoveryResponse) => {
        const flat = Object.values(data.experiences ?? {}).flat();
        setAllExperiences(flat);
      })
      .catch(() => {});
  }, [allExperiences.length]);

  // Fetch collections once — keep alive across tab switches
  const loadCollections = useCallback(() => {
    if (collectionsLoading) return;
    setCollectionsLoading(true);
    listCollections()
      .then((data) => {
setMyCollections(data.my_collections ?? []);
        setSavedCollections(data.saved_collections ?? []);
        setCollectionsLoaded(true);
      })
      .catch((err) => {
        console.error("[Collections] API error:", err);
        setCollectionsLoaded(true);
      })
      .finally(() => setCollectionsLoading(false));
  }, [collectionsLoading]);

  useEffect(() => {
    if (!collectionsLoaded) loadCollections();
  }, [collectionsLoaded, loadCollections]);

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
              onClick={() => {
                // Force refetch whenever user explicitly opens the collections tab
                if (tab === "collections") setCollectionsLoaded(false);
                setActiveTab(tab);
              }}
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
            <div className="px-5 grid grid-cols-2 gap-3 pb-28">
              {experiences.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  experience={exp}
                  className="w-full"
                  compact
                  onClick={() => setSelected(exp)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "collections" && (
        <CollectionsTab
          allExperiences={allExperiences}
          myCollections={myCollections}
          savedCollections={savedCollections}
          loading={collectionsLoading && !collectionsLoaded}
          onMyCollectionsChange={setMyCollections}
          onSavedCollectionsChange={setSavedCollections}
        />
      )}
    </div>
  );
}
