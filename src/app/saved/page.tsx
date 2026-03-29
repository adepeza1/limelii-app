"use client";

import { useState, useEffect, useCallback } from "react";
import { CollectionsTab } from "@/components/collections-tab";
import type { Experience, DiscoveryResponse } from "@/app/page";
import type { Collection, SavedCollection } from "@/lib/collections";
import { listCollections } from "@/lib/collections";
import { API_BASE } from "@/lib/xano";

type CollectionsPageTab = "browse" | "mine";

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<CollectionsPageTab>("browse");
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);

  // Collections state lifted here so it survives tab switching
  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [savedCollections, setSavedCollections] = useState<SavedCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

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

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[44px]" />

      {/* Page header */}
      <div className="px-5 pt-4 pb-4">
        <h1 className="text-[#101828] text-[2.25rem] font-bold leading-tight">Collections</h1>
        <p className="text-[#667085] text-sm mt-1">
          {activeTab === "browse"
            ? "Collections saved from others."
            : "Your curated collections."}
        </p>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 bg-[#F2F4F7] rounded-xl p-1">
          {(
            [
              { id: "browse" as const, label: "Browse Collections" },
              { id: "mine" as const, label: "My Collections" },
            ]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                if (id === "mine") setCollectionsLoaded(false);
                setActiveTab(id);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === id
                  ? "bg-white text-[#101828] shadow-sm"
                  : "text-[#667085]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <CollectionsTab
        allExperiences={allExperiences}
        myCollections={myCollections}
        savedCollections={savedCollections}
        loading={collectionsLoading && !collectionsLoaded}
        onMyCollectionsChange={setMyCollections}
        onSavedCollectionsChange={setSavedCollections}
        mode={activeTab}
      />
    </div>
  );
}
