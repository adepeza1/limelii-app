"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Experience, DiscoveryResponse } from "@/app/page";
import type { Collection } from "@/lib/collections";
import { listPublicCollections } from "@/lib/collections";
import { API_BASE } from "@/lib/xano";
import {
  BrowseCollectionCard,
  getTagsForCollection,
} from "@/components/browse-collection-card";

type CollectionsPageTab = "browse" | "following";

// ─── Browse Tab ───────────────────────────────────────────────────────────────

function BrowseTab({
  collections,
  allExperiences,
  loading,
  filterPills,
  activeFilter,
  onFilterChange,
}: {
  collections: Collection[];
  allExperiences: Experience[];
  loading: boolean;
  filterPills: string[];
  activeFilter: string;
  onFilterChange: (f: string) => void;
}) {
  return (
    <>
      <div
        className="flex gap-2 px-5 py-3 overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {filterPills.map((pill) => (
          <button
            key={pill}
            onClick={() => onFilterChange(pill)}
            className={`shrink-0 text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              activeFilter === pill
                ? "bg-[#E8405A] text-white"
                : "bg-white border border-[#EAECF0] text-[#101828]"
            }`}
          >
            {pill}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-5 py-16 flex items-center justify-center">
          <p className="text-sm text-[#667085]">Loading collections…</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FB6983" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-[#101828] font-semibold text-base">No public collections yet</p>
          <p className="text-[#667085] text-sm max-w-[240px]">
            {activeFilter === "All"
              ? "Collections made public by other users will appear here."
              : `No collections tagged "${activeFilter}" yet.`}
          </p>
        </div>
      ) : (
        <div className="px-5 pb-28 flex flex-col gap-4">
          {collections.map((col) => {
            const tags = getTagsForCollection(col, allExperiences);
            return (
              <BrowseCollectionCard
                key={col.id}
                collection={col}
                allExperiences={allExperiences}
                tags={tags}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Following Tab ────────────────────────────────────────────────────────────

function FollowingTab({ allExperiences }: { allExperiences: Experience[] }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collections/following")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-5 py-16 flex items-center justify-center">
        <p className="text-sm text-[#667085]">Loading…</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F2F4F7] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-[#101828] font-semibold text-base">No followed users yet</p>
        <p className="text-[#667085] text-sm max-w-[240px]">
          Follow users from Browse to see their collections here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-28 flex flex-col gap-4 pt-4">
      {collections.map((col) => {
        const tags = getTagsForCollection(col, allExperiences);
        return (
          <BrowseCollectionCard
            key={col.id}
            collection={col}
            allExperiences={allExperiences}
            tags={tags}
          />
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<CollectionsPageTab>("browse");
  const [activeFilter, setActiveFilter] = useState("All");
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);


  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((data: DiscoveryResponse) => {
        setAllExperiences(Object.values(data.experiences ?? {}).flat());
      })
      .catch(() => {});
  }, []);

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

  const filterPills = useMemo(() => {
    const tagSet = new Set<string>();
    for (const col of publicCollections) {
      getTagsForCollection(col, allExperiences).forEach((t) => tagSet.add(t));
    }
    return ["All", ...Array.from(tagSet).slice(0, 8)];
  }, [publicCollections, allExperiences]);

  const filteredPublic = useMemo(() => {
    if (activeFilter === "All") return publicCollections;
    return publicCollections.filter((col) => {
      const tags = getTagsForCollection(col, allExperiences);
      return tags.some((t) => t.toLowerCase() === activeFilter.toLowerCase());
    });
  }, [publicCollections, allExperiences, activeFilter]);

  const TAB_LABELS: { id: CollectionsPageTab; label: string }[] = [
    { id: "browse", label: "Browse" },
    { id: "following", label: "Following" },
  ];

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[44px]" />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-[#101828] text-2xl font-bold leading-tight">Collections</h1>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full border border-[#EAECF0] flex items-center justify-center">
            <Search size={16} className="text-[#667085]" />
          </button>
          <button className="w-9 h-9 rounded-full border border-[#EAECF0] flex items-center justify-center">
            <SlidersHorizontal size={16} className="text-[#667085]" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex px-5 border-b border-[#EAECF0]">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`mr-6 pb-3 text-sm font-semibold transition-colors ${
              activeTab === id
                ? "text-[#E8405A] border-b-2 border-[#E8405A]"
                : "text-[#667085]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "browse" ? (
        <BrowseTab
          collections={filteredPublic}
          allExperiences={allExperiences}
          loading={browseLoading && !browseLoaded}
          filterPills={filterPills}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      ) : (
        <FollowingTab allExperiences={allExperiences} />
      )}
    </div>
  );
}
