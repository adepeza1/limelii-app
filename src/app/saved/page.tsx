"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { Experience, DiscoveryResponse } from "@/app/page";
import type { Collection, SharedCollection } from "@/lib/collections";
import { listPublicCollections, listSharedCollections } from "@/lib/collections";
import { API_BASE } from "@/lib/xano";
import { Lock } from "lucide-react";
import {
  BrowseCollectionCard,
  getTagsForCollection,
} from "@/components/browse-collection-card";

type CollectionsPageTab = "browse" | "following" | "shared";

// ─── Browse Tab ───────────────────────────────────────────────────────────────

function BrowseTab({
  collections,
  allExperiences,
  loading,
  filterPills,
  activeFilters,
  onFilterChange,
  currentUserId,
  followedIds,
}: {
  collections: Collection[];
  allExperiences: Experience[];
  loading: boolean;
  filterPills: string[];
  activeFilters: string[];
  onFilterChange: (f: string) => void;
  currentUserId?: number | null;
  followedIds?: number[] | null;
}) {
  return (
    <>
      <div
        className="flex gap-6 px-5 py-3 overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {filterPills.map((pill) => (
          <button
            key={pill}
            onClick={() => onFilterChange(pill)}
            className={`shrink-0 text-sm font-medium pb-2 transition-colors ${
              activeFilters.includes(pill)
                ? "text-[#FB6983] border-b-2 border-[#FB6983]"
                : "text-[#667085]"
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
          <p className="text-[#101828] font-semibold text-base">No collections found</p>
          <p className="text-[#667085] text-sm max-w-[240px]">
            {!activeFilters.includes("All")
              ? `No collections tagged "${activeFilters.join('", "')}".`
              : "Try a different search term."}
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
                currentUserId={currentUserId}
                followedIds={followedIds}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Following Tab ────────────────────────────────────────────────────────────

function FollowingTab({ allExperiences, currentUserId, followedIds }: { allExperiences: Experience[]; currentUserId?: number | null; followedIds?: number[] | null }) {
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
            currentUserId={currentUserId}
            followedIds={followedIds}
          />
        );
      })}
    </div>
  );
}

// ─── Shared Tab ───────────────────────────────────────────────────────────────

function SharedTab({ allExperiences, currentUserId }: { allExperiences: Experience[]; currentUserId?: number | null }) {
  const [items, setItems] = useState<SharedCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSharedCollections()
      .then((data) => setItems(Array.isArray(data) ? data : []))
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

  if (items.length === 0) {
    return (
      <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F2F4F7] flex items-center justify-center">
          <Lock size={24} className="text-[#667085]" />
        </div>
        <p className="text-[#101828] font-semibold text-base">No shared collections</p>
        <p className="text-[#667085] text-sm max-w-[240px]">
          Collections shared with you via a private link will appear here.
        </p>
      </div>
    );
  }

  // Map SharedCollection → Collection shape for BrowseCollectionCard
  const asCollections: Collection[] = items.map((item) => {
    let expIds: number[] = [];
    try { expIds = JSON.parse(item.collection_experience_ids); } catch { expIds = []; }
    return {
      id: item.collection_id,
      created_at: item.created_at,
      name: item.collection_name,
      description: item.collection_description,
      is_public: item.collection_is_public,
      owner_user_id: item.owner_id,
      owner_handle: item.owner_username,
      experience_ids: expIds,
      share_token: item.collection_share_token,
    };
  });

  return (
    <div className="px-5 pb-28 flex flex-col gap-4 pt-4">
      {asCollections.map((col) => {
        const tags = getTagsForCollection(col, allExperiences);
        return (
          <div key={col.id} className="relative">
            {!col.is_public && (
              <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                <Lock size={11} className="text-white" />
              </div>
            )}
            <BrowseCollectionCard
              collection={col}
              allExperiences={allExperiences}
              tags={tags}
              currentUserId={currentUserId}
              followedIds={null}
              hideFollow
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function collectionMatchesQuery(col: Collection, query: string, allExperiences: Experience[]): boolean {
  const q = query.toLowerCase();
  // Collection name
  if (col.name?.toLowerCase().includes(q)) return true;
  // Resolve experiences for this collection
  let ids: number[] = [];
  if (Array.isArray(col.experience_ids)) ids = col.experience_ids as unknown as number[];
  else if (typeof col.experience_ids === "string") {
    try { ids = JSON.parse(col.experience_ids); } catch { ids = []; }
  }
  const idSet = new Set(ids);
  const exps = allExperiences.filter((e) => idSet.has(e.id));
  for (const exp of exps) {
    if (exp.title?.toLowerCase().includes(q)) return true;
    for (const place of exp.places_id ?? []) {
      if (place.name?.toLowerCase().includes(q)) return true;
      if (place.neighborhood?.toLowerCase().includes(q)) return true;
      if (place.borough?.toLowerCase().includes(q)) return true;
      for (const t of place._location_details?.location_type ?? []) {
        if (t.toLowerCase().includes(q)) return true;
      }
    }
    for (const act of exp.activities ?? []) {
      if (act.toLowerCase().includes(q)) return true;
    }
    for (const n of exp.neighborhoods ?? []) {
      if (n.toLowerCase().includes(q)) return true;
    }
  }
  return false;
}

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<CollectionsPageTab>("browse");
  const [activeFilters, setActiveFilters] = useState<string[]>(["All"]);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [followedIds, setFollowedIds] = useState<number[] | null>(null);
  const [followingTabKey, setFollowingTabKey] = useState(0);

  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        if (u?.id) {
          setCurrentUserId(u.id);
          fetch("/api/users/me/following")
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (Array.isArray(data?.followingIds)) setFollowedIds(data.followingIds); })
            .catch(() => setFollowedIds([]));
        }
      })
      .catch(() => {});
  }, []);

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

  const handleFilterChange = useCallback((pill: string) => {
    if (pill === "All") {
      setActiveFilters(["All"]);
      return;
    }
    setActiveFilters((prev) => {
      const withoutAll = prev.filter((f) => f !== "All");
      const isSelected = withoutAll.includes(pill);
      const next = isSelected
        ? withoutAll.filter((f) => f !== pill)
        : [...withoutAll, pill];
      return next.length === 0 ? ["All"] : next;
    });
  }, []);

  const filteredPublic = useMemo(() => {
    let result = publicCollections;
    if (!activeFilters.includes("All")) {
      result = result.filter((col) => {
        const tags = getTagsForCollection(col, allExperiences);
        return activeFilters.some((f) =>
          tags.some((t) => t.toLowerCase() === f.toLowerCase())
        );
      });
    }
    if (searchQuery.trim()) {
      result = result.filter((col) => collectionMatchesQuery(col, searchQuery.trim(), allExperiences));
    }
    return result;
  }, [publicCollections, allExperiences, activeFilters, searchQuery]);

  const TAB_LABELS: { id: CollectionsPageTab; label: string }[] = [
    { id: "browse", label: "Browse" },
    { id: "following", label: "Following" },
    { id: "shared", label: "Shared" },
  ];

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[env(safe-area-inset-top,44px)]" />

      {/* Header */}
      <div className="px-5 pt-2 pb-3">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-2xl px-3 py-2">
              <Search size={15} className="text-[#98A2B3] shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, place, type…"
                className="flex-1 text-sm text-[#101828] placeholder:text-[#98A2B3] bg-transparent outline-none"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X size={14} className="text-[#98A2B3]" />
                </button>
              )}
            </div>
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              className="text-sm font-medium text-[#667085] shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h1 className="text-[#101828] text-lg font-medium">Collections</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                className="w-9 h-9 rounded-full border border-[#EAECF0] flex items-center justify-center"
              >
                <Search size={16} className="text-[#667085]" />
              </button>
              <button className="w-9 h-9 rounded-full border border-[#EAECF0] flex items-center justify-center">
                <SlidersHorizontal size={16} className="text-[#667085]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex px-5 border-b border-[#EAECF0]">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); if (id === "following") setFollowingTabKey((k) => k + 1); }}
            className={`mr-6 pb-3 text-sm font-semibold transition-colors ${
              activeTab === id
                ? "text-[#FF9A56] border-b-2 border-[#FF9A56]"
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
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          currentUserId={currentUserId}
          followedIds={followedIds}
        />
      ) : activeTab === "following" ? (
        <FollowingTab key={followingTabKey} allExperiences={allExperiences} currentUserId={currentUserId} followedIds={followedIds} />
      ) : (
        <SharedTab allExperiences={allExperiences} currentUserId={currentUserId} />
      )}
    </div>
  );
}
