"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionsTab } from "@/components/collections-tab";
import type { Experience, DiscoveryResponse } from "@/app/page";
import type { Collection, SavedCollection } from "@/lib/collections";
import { listCollections, listPublicCollections } from "@/lib/collections";
import { API_BASE } from "@/lib/xano";

type CollectionsPageTab = "browse" | "mine";

function CollectionsPageInner() {
  const searchParams = useSearchParams();
  const initialTab: CollectionsPageTab =
    searchParams.get("tab") === "mine" ? "mine" : "browse";

  const [activeTab, setActiveTab] = useState<CollectionsPageTab>(initialTab);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);

  // My collections state
  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [savedCollections, setSavedCollections] = useState<SavedCollection[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myLoaded, setMyLoaded] = useState(false);

  // Public collections state (Browse tab)
  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);

  const loadingRef = useRef(false);

  // Fetch all experiences (used for tag derivation)
  useEffect(() => {
    if (allExperiences.length > 0) return;
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((data: DiscoveryResponse) => {
        setAllExperiences(Object.values(data.experiences ?? {}).flat());
      })
      .catch(() => {});
  }, [allExperiences.length]);

  // Fetch my collections
  const loadMyCollections = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setMyLoading(true);
    listCollections()
      .then((data) => {
        setMyCollections(data.my_collections ?? []);
        setSavedCollections(data.saved_collections ?? []);
        setMyLoaded(true);
      })
      .catch(() => setMyLoaded(true))
      .finally(() => { setMyLoading(false); loadingRef.current = false; });
  }, []);

  useEffect(() => {
    if (!myLoaded) loadMyCollections();
  }, [myLoaded, loadMyCollections]);

  // Fetch public collections (Browse tab)
  const loadPublicCollections = useCallback(() => {
    setBrowseLoading(true);
    listPublicCollections()
      .then((cols) => {
        setPublicCollections(cols);
        setBrowseLoaded(true);
      })
      .catch(() => setBrowseLoaded(true))
      .finally(() => setBrowseLoading(false));
  }, []);

  useEffect(() => {
    if (!browseLoaded) loadPublicCollections();
  }, [browseLoaded, loadPublicCollections]);

  // Live-update collection counts when an experience is added via AddToCollectionSheet
  useEffect(() => {
    function handleUpdate(e: Event) {
      const updated: Collection[] = (e as CustomEvent).detail?.updated ?? [];
      if (updated.length === 0) return;
      setMyCollections((prev) =>
        prev.map((c) => {
          const fresh = updated.find((u) => u.id === c.id);
          return fresh ?? c;
        })
      );
    }
    window.addEventListener("limelii:collections-updated", handleUpdate);
    return () => window.removeEventListener("limelii:collections-updated", handleUpdate);
  }, []);

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[44px]" />

      {/* Page header */}
      <div className="px-5 pt-4 pb-4">
        <h1 className="text-[#101828] text-[2.25rem] font-bold leading-tight">Collections</h1>
        <p className="text-[#667085] text-sm mt-1">
          {activeTab === "browse"
            ? "Discover collections from the community."
            : "Your curated collections."}
        </p>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 bg-[#F2F4F7] rounded-xl p-1">
          {(
            [
              { id: "browse" as const, label: "Browse" },
              { id: "mine" as const, label: "My Collections" },
            ]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
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
      {activeTab === "browse" ? (
        <BrowseTab
          publicCollections={publicCollections}
          allExperiences={allExperiences}
          loading={browseLoading && !browseLoaded}
          onSelect={(col) => {
            // Open via CollectionsTab by temporarily switching to mine with selected
          }}
        />
      ) : (
        <CollectionsTab
          allExperiences={allExperiences}
          myCollections={myCollections}
          savedCollections={savedCollections}
          loading={myLoading && !myLoaded}
          onMyCollectionsChange={setMyCollections}
          onSavedCollectionsChange={setSavedCollections}
          mode="mine"
        />
      )}
    </div>
  );
}

function getTagsForCollection(collection: Collection, allExperiences: Experience[]): string[] {
  let ids: number[] = [];
  if (Array.isArray(collection.experience_ids)) ids = collection.experience_ids;
  else if (typeof collection.experience_ids === "string") {
    try { ids = JSON.parse(collection.experience_ids); } catch { ids = []; }
  }
  const idSet = new Set(ids);
  const activities = new Set<string>();
  for (const exp of allExperiences) {
    if (!idSet.has(exp.id)) continue;
    for (const act of exp.activities ?? []) {
      activities.add(act);
      if (activities.size >= 4) break;
    }
    if (activities.size >= 4) break;
  }
  return Array.from(activities).slice(0, 4);
}

function BrowseTab({
  publicCollections,
  allExperiences,
  loading,
}: {
  publicCollections: Collection[];
  allExperiences: Experience[];
  loading: boolean;
  onSelect: (col: Collection) => void;
}) {
  if (loading) {
    return (
      <div className="px-5 py-16 flex items-center justify-center">
        <p className="text-sm text-[#667085]">Loading collections…</p>
      </div>
    );
  }

  if (publicCollections.length === 0) {
    return (
      <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FB6983" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-[#101828] font-semibold text-base">No public collections yet</p>
        <p className="text-[#667085] text-sm max-w-[240px]">
          Collections made public by other users will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-28">
      <span className="text-xs text-[#667085] uppercase tracking-wide font-medium block mb-4">
        {publicCollections.length} collection{publicCollections.length !== 1 ? "s" : ""}
      </span>
      <div className="flex flex-col gap-3">
        {publicCollections.map((col) => {
          const tags = getTagsForCollection(col, allExperiences);
          return (
            <BrowseCollectionCard key={col.id} collection={col} tags={tags} />
          );
        })}
      </div>
    </div>
  );
}

function BrowseCollectionCard({ collection, tags }: { collection: Collection; tags: string[] }) {
  let ids: number[] = [];
  if (Array.isArray(collection.experience_ids)) ids = collection.experience_ids;
  else if (typeof collection.experience_ids === "string") {
    try { ids = JSON.parse(collection.experience_ids); } catch { ids = []; }
  }
  const count = ids.length;

  return (
    <div className="relative">
      {/* Stacked card effect */}
      <div className="absolute inset-x-4 top-3 bottom-0 rounded-2xl bg-[#FFF0F3] border border-[#FFD6DE]" />
      <div className="absolute inset-x-2 top-1.5 bottom-0 rounded-2xl bg-[#FFE4EA] border border-[#FFBFCC]" />
      <div className="relative rounded-2xl bg-white border border-[#EAECF0] shadow-sm px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[#101828] text-sm font-semibold truncate">{collection.name}</p>
            <p className="text-[#667085] text-xs mt-0.5">
              {count} {count === 1 ? "experience" : "experiences"}
              {(collection._users?.username || collection.owner_handle) && (
                <span className="text-[#98A2B3]"> · by @{collection._users?.username ?? collection.owner_handle}</span>
              )}
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#667085]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full shrink-0 bg-[#ECFDF3] text-[#027A48]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Public
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="bg-white min-h-screen" />}>
      <CollectionsPageInner />
    </Suspense>
  );
}
