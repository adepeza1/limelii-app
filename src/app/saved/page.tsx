"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { Experience, DiscoveryResponse } from "@/app/page";
import type { Collection, SharedCollection, SharedExperience } from "@/lib/collections";
import { listPublicCollections, listSharedCollections } from "@/lib/collections";
import { API_BASE } from "@/lib/xano";
import { Lock, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserResult {
  id: number;
  username: string;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photo?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile_photo_url?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  picture?: any;
}
import {
  BrowseCollectionCard,
  getTagsForCollection,
} from "@/components/browse-collection-card";

type CollectionsPageTab = "browse" | "following" | "shared";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CollectionCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-[#F2F4F7] animate-pulse">
      <div className="h-36 bg-gray-100" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="h-4 w-2/3 bg-gray-100 rounded-full" />
        <div className="h-3 w-1/2 bg-gray-100 rounded-full" />
        <div className="flex gap-2 mt-1">
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function CollectionSkeletons() {
  return (
    <div className="px-5 pb-28 flex flex-col gap-4 pt-2">
      {[1, 2, 3].map((i) => <CollectionCardSkeleton key={i} />)}
    </div>
  );
}

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
        <CollectionSkeletons />
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

function FollowingTab({ allExperiences, currentUserId, followedIds, onSwitchToBrowse }: { allExperiences: Experience[]; currentUserId?: number | null; followedIds?: number[] | null; onSwitchToBrowse: () => void }) {
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
    return <CollectionSkeletons />;
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
          Follow people from Browse to see their collections here.
        </p>
        <button
          onClick={onSwitchToBrowse}
          className="mt-1 bg-[#667085] text-white font-semibold rounded-2xl px-6 py-2.5 text-sm"
        >
          Browse Collections
        </button>
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
  const router = useRouter();
  const [collections, setCollections] = useState<SharedCollection[]>([]);
  const [experiences, setExperiences] = useState<SharedExperience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listSharedCollections().catch(() => [] as SharedCollection[]),
      fetch("/api/experiences/shared").then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([cols, exps]) => {
      setCollections(Array.isArray(cols) ? cols : []);
      setExperiences(Array.isArray(exps) ? exps : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <CollectionSkeletons />;
  }

  if (collections.length === 0 && experiences.length === 0) {
    return (
      <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F2F4F7] flex items-center justify-center">
          <Lock size={24} className="text-[#667085]" />
        </div>
        <p className="text-[#101828] font-semibold text-base">Nothing shared yet</p>
        <p className="text-[#667085] text-sm max-w-[240px]">
          Collections and experiences shared with you will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-28 flex flex-col gap-4 pt-4">
      {/* Shared experiences */}
      {experiences.map((item) => (
        <div key={`exp-${item.id}`} className="flex flex-col gap-1">
          {item.shared_by_username && (
            <p className="text-xs text-[#98A2B3] px-1">
              Shared by <span className="font-semibold text-[#667085]">@{item.shared_by_username}</span>
            </p>
          )}
          <button
            onClick={() => router.push(`/experience/${item.experience_id}`)}
            className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F2F4F7]"
          >
            {item.experience_image ? (
              <div className="h-36 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.experience_image} alt={item.experience_title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-36 w-full bg-[#F2F4F7] flex items-center justify-center">
                <MapPin size={28} className="text-[#D0D5DD]" />
              </div>
            )}
            <div className="p-4">
              <p className="font-semibold text-[#101828] text-sm leading-snug">{item.experience_title}</p>
              {item.experience_description && (
                <p className="text-xs text-[#667085] mt-1 line-clamp-2">{item.experience_description}</p>
              )}
            </div>
          </button>
        </div>
      ))}

      {/* Shared collections */}
      {collections.map((item) => {
        let expIds: number[] = [];
        try { expIds = JSON.parse(item.collection_experience_ids); } catch { expIds = []; }
        const col: Collection = {
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
        const tags = getTagsForCollection(col, allExperiences);
        const sharedByHandle = item.shared_by_username;
        return (
          <div key={`col-${item.id}`} className="flex flex-col gap-1">
            {sharedByHandle && (
              <p className="text-xs text-[#98A2B3] px-1">
                Shared by <span className="font-semibold text-[#667085]">@{sharedByHandle}</span>
              </p>
            )}
            <div className="relative">
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CollectionsPageTab>("browse");
  const [activeFilters, setActiveFilters] = useState<string[]>(["All"]);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [followedIds, setFollowedIds] = useState<number[] | null>(null);
  const [followingTabKey, setFollowingTabKey] = useState(0);
  const [sharedTabKey, setSharedTabKey] = useState(0);

  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const ptrStartY = useRef(0);
  const ptrStartX = useRef(0);
  const ptrActive = useRef(false);
  const PULL_THRESHOLD = 65;
  const PULL_MAX = 80;

  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const userDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function doRefresh() {
    if (activeTab === "browse") {
      setBrowseLoaded(false);
      loadPublicCollections();
    } else if (activeTab === "following") {
      setFollowingTabKey((k) => k + 1);
    } else if (activeTab === "shared") {
      setSharedTabKey((k) => k + 1);
    }
    setTimeout(() => setRefreshing(false), 800);
  }

  function onPTRTouchStart(e: React.TouchEvent) {
    if (window.scrollY > 0 || refreshing) return;
    ptrStartY.current = e.touches[0].clientY;
    ptrStartX.current = e.touches[0].clientX;
    ptrActive.current = false;
  }

  function onPTRTouchMove(e: React.TouchEvent) {
    if (refreshing || window.scrollY > 0) return;
    const dy = e.touches[0].clientY - ptrStartY.current;
    const dx = Math.abs(e.touches[0].clientX - ptrStartX.current);
    if (!ptrActive.current) {
      if (dy > 8 && dy > dx * 1.5) ptrActive.current = true;
      else return;
    }
    if (dy > 0) setPullY(Math.min(dy * 0.45, PULL_MAX));
  }

  function onPTRTouchEnd() {
    ptrActive.current = false;
    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullY(0);
      doRefresh();
    } else {
      setPullY(0);
    }
  }

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
    <div
      className="bg-white min-h-screen max-w-5xl mx-auto"
      onTouchStart={onPTRTouchStart}
      onTouchMove={onPTRTouchMove}
      onTouchEnd={onPTRTouchEnd}
    >
      <div className="h-[env(safe-area-inset-top,44px)]" />

      {/* Pull-to-refresh indicator */}
      <div
        className="overflow-hidden flex items-center justify-center gap-2"
        style={{
          height: refreshing ? 52 : pullY,
          transition: pullY === 0 ? "height 0.2s ease-out" : "none",
        }}
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-[#FB6983]/30"
          style={{
            borderTopColor: "#FB6983",
            animation: refreshing || pullY >= PULL_THRESHOLD ? "spin 0.75s linear infinite" : "none",
          }}
        />
        <span className="text-xs text-[#98A2B3]">
          {refreshing ? "Refreshing…" : pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>

      {/* Header */}
      <div className="px-5 pt-2 pb-3">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-2xl px-3 py-2">
              <Search size={15} className="text-[#98A2B3] shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (userDebounceRef.current) clearTimeout(userDebounceRef.current);
                  if (!val.trim()) { setUserResults([]); setUserSearchLoading(false); return; }
                  setUserSearchLoading(true);
                  userDebounceRef.current = setTimeout(() => {
                    fetch(`/api/users/search?q=${encodeURIComponent(val.trim())}`)
                      .then((r) => r.ok ? r.json() : [])
                      .then((data) => setUserResults(Array.isArray(data) ? data : []))
                      .catch(() => setUserResults([]))
                      .finally(() => setUserSearchLoading(false));
                  }, 350);
                }}
                placeholder="Search collections, places, people…"
                className="flex-1 text-sm text-[#101828] placeholder:text-[#98A2B3] bg-transparent outline-none"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setUserResults([]); if (userDebounceRef.current) clearTimeout(userDebounceRef.current); }}>
                  <X size={14} className="text-[#98A2B3]" />
                </button>
              )}
            </div>
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); setUserResults([]); if (userDebounceRef.current) clearTimeout(userDebounceRef.current); }}
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

      {/* Tab bar — hidden while searching */}
      {!searchQuery.trim() && (
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
      )}

      {/* Search results */}
      {searchQuery.trim() ? (
        <div className="px-5 pb-28 pt-4 flex flex-col gap-6">
          {/* People */}
          <section>
            <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">People</p>
            {userSearchLoading ? (
              <p className="text-sm text-[#667085]">Searching…</p>
            ) : userResults.length === 0 ? (
              <p className="text-sm text-[#98A2B3]">No users found</p>
            ) : (
              <div className="flex flex-col gap-1">
                {userResults.map((user) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  function extractUrl(val: any): string | null {
                    if (!val) return null;
                    if (typeof val === "string") return val || null;
                    if (typeof val === "object" && typeof val.url === "string") return val.url || null;
                    return null;
                  }
                  const photoUrl = extractUrl(user.photo) ?? extractUrl(user.profile_photo_url) ?? extractUrl(user.picture);
                  const initials = user.username.slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={user.id}
                      onClick={() => router.push(`/u/${encodeURIComponent(user.username)}`)}
                      className="flex items-center gap-3 py-2.5 w-full text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center text-sm font-bold text-[#667085] shrink-0 overflow-hidden">
                        {photoUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={photoUrl} alt={user.username} className="w-full h-full object-cover" />
                          : initials}
                      </div>
                      <div className="min-w-0">
                        {user.name && <p className="text-sm font-semibold text-[#101828] leading-tight truncate">{user.name}</p>}
                        <p className="text-sm text-[#667085]">@{user.username}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Collections */}
          <section>
            <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Collections</p>
            {(() => {
              const results = publicCollections.filter((col) => collectionMatchesQuery(col, searchQuery.trim(), allExperiences));
              if (results.length === 0) return <p className="text-sm text-[#98A2B3]">No collections found</p>;
              return (
                <div className="flex flex-col gap-4">
                  {results.map((col) => {
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
            })()}
          </section>
        </div>
      ) : (
        /* Normal tab content */
        <>
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
            <FollowingTab key={followingTabKey} allExperiences={allExperiences} currentUserId={currentUserId} followedIds={followedIds} onSwitchToBrowse={() => setActiveTab("browse")} />
          ) : (
            <SharedTab key={sharedTabKey} allExperiences={allExperiences} currentUserId={currentUserId} />
          )}
        </>
      )}
    </div>
  );
}
