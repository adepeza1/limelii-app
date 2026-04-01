"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, Heart, MessageCircle, X, Send, ChevronLeft, Trash2 } from "lucide-react";
import { CollectionsTab } from "@/components/collections-tab";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import type { Experience, DiscoveryResponse } from "@/app/page";
import type { Collection, SavedCollection } from "@/lib/collections";
import { listCollections, listPublicCollections } from "@/lib/collections";
import { API_BASE } from "@/lib/xano";

type CollectionsPageTab = "browse" | "following" | "mine";

interface Comment {
  id: number;
  created_at: number;
  user_id: number;
  collection_id: number;
  text?: string;
  comment_text?: string;
  _user?: { username?: string; name?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExpImage(exp: Experience): string | null {
  return (exp.places_id ?? []).flatMap((p) => p.display_images ?? []).find((img) => img.url)?.url ?? null;
}

function parseExperienceIds(collection: Collection): number[] {
  if (Array.isArray(collection.experience_ids)) return collection.experience_ids as unknown as number[];
  if (typeof collection.experience_ids === "string") {
    try { return JSON.parse(collection.experience_ids); } catch { return []; }
  }
  return [];
}

function getTagsForCollection(collection: Collection, allExperiences: Experience[]): string[] {
  const ids = new Set(parseExperienceIds(collection));
  const activities = new Set<string>();
  for (const exp of allExperiences) {
    if (!ids.has(exp.id)) continue;
    for (const act of exp.activities ?? []) {
      activities.add(act);
      if (activities.size >= 4) break;
    }
    if (activities.size >= 4) break;
  }
  return Array.from(activities).slice(0, 4);
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 5) return "now";
  if (s < 60) return `< 1m`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

// ─── Mosaic ───────────────────────────────────────────────────────────────────

const MOSAIC_COLORS = ["#EDCFC6", "#D4C9B8", "#B8CBBF", "#C9D4E0", "#D4C9D4"];

function CollectionMosaic({ ids, allExperiences, resolvedExperiences }: { ids: number[]; allExperiences: Experience[]; resolvedExperiences?: Experience[] }) {
  const pool = resolvedExperiences && resolvedExperiences.length > 0 ? resolvedExperiences : allExperiences;
  const slots = ids
    .slice(0, 3)
    .map((id) => pool.find((e) => e.id === id))
    .map((exp, i): string => (exp ? (getExpImage(exp) ?? MOSAIC_COLORS[i]) : MOSAIC_COLORS[i]));

  if (slots.length === 0) slots.push(MOSAIC_COLORS[0]);

  return (
    <div className="flex gap-0.5 w-full h-full">
      {slots.map((src, i) => (
        <div key={i} className="flex-1 h-full overflow-hidden">
          {src.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: src }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Comments Sheet ───────────────────────────────────────────────────────────

function CommentsSheet({
  collectionId,
  onClose,
}: {
  collectionId: number;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/collections/${collectionId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => { if (u?.id) setCurrentUserId(u.id); })
      .catch(() => {});
  }, [collectionId]);

  async function handlePost() {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        setText("");
        const refreshed = await fetch(`/api/collections/${collectionId}/comments`);
        if (refreshed.ok) {
          const data = await refreshed.json();
          setComments(Array.isArray(data) ? data : []);
        }
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: number) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await fetch(`/api/collections/${collectionId}/comments/${commentId}`, { method: "DELETE" });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[800]" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[801] bg-white rounded-t-2xl max-h-[70vh] flex flex-col max-w-5xl mx-auto">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#EAECF0]">
          <p className="text-[#101828] font-semibold text-base">Comments</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F4F7]">
            <X size={16} className="text-[#667085]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 pb-6 flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-[#667085] text-center py-8">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-[#667085] text-center py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[10px] font-bold text-[#667085] shrink-0">
                  {(c._user?.username ?? c._user?.name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-[#101828]">
                      {c._user?.username ?? c._user?.name ?? "user"}
                    </p>
                    <p className="text-[10px] text-[#98A2B3]">{relativeTime(c.created_at)}</p>
                  </div>
                  <p className="text-sm text-[#344054] mt-0.5">{c.comment_text ?? c.text}</p>
                </div>
                {currentUserId && c.user_id === currentUserId && (
                  <button onClick={() => handleDelete(c.id)} className="shrink-0 p-1 text-[#98A2B3] hover:text-[#E8405A]">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#EAECF0] flex items-center gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePost(); }}
            placeholder="Add a comment…"
            className="flex-1 text-sm bg-[#F9FAFB] rounded-full px-4 py-2 outline-none border border-[#EAECF0] placeholder:text-[#98A2B3]"
          />
          <button
            onClick={handlePost}
            disabled={!text.trim() || posting}
            className="w-9 h-9 rounded-full bg-[#E8405A] flex items-center justify-center disabled:opacity-40"
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Browse Collection Card ───────────────────────────────────────────────────

function BrowseCollectionCard({
  collection,
  allExperiences,
  tags,
}: {
  collection: Collection;
  allExperiences: Experience[];
  tags: string[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = collection as any;

  const LIKED_KEY = "limelii_liked_collections";
  function getLikedIds(): number[] {
    try { return JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]"); } catch { return []; }
  }

  const [liked, setLiked] = useState<boolean>(() => getLikedIds().includes(collection.id));
  const [likeCount, setLikeCount] = useState<number>(col.likes_count ?? 0);
  const [following, setFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(col.comments_count ?? 0);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedExp, setSelectedExp] = useState<Experience | null>(null);

  const ids = parseExperienceIds(collection);
  const count = ids.length;
  const ownerHandle = collection._users?.username ?? collection.owner_handle;
  const ownerId = collection._users?.id ?? col.users_id;
  const initials = ownerHandle ? ownerHandle.slice(0, 2).toUpperCase() : "?";
  const planUrl = collection.id ? `/plan?collection_id=${collection.id}` : "/plan";

  async function handleLike() {
    const nextLiked = !liked;
    // Optimistic update
    setLiked(nextLiked);
    setLikeCount((prev) => nextLiked ? prev + 1 : prev - 1);
    // Persist liked state in localStorage
    const ids = getLikedIds().filter((id) => id !== collection.id);
    if (nextLiked) ids.push(collection.id);
    localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
    try {
      const res = await fetch(`/api/collections/${collection.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.count);
        // Sync with server response
        const synced = getLikedIds().filter((id) => id !== collection.id);
        if (data.liked) synced.push(collection.id);
        localStorage.setItem(LIKED_KEY, JSON.stringify(synced));
      }
    } catch {
      // Revert on failure
      setLiked(liked);
      setLikeCount((prev) => nextLiked ? prev - 1 : prev + 1);
      const reverted = getLikedIds().filter((id) => id !== collection.id);
      if (liked) reverted.push(collection.id);
      localStorage.setItem(LIKED_KEY, JSON.stringify(reverted));
    }
  }

  async function handleFollow() {
    const next = !following;
    setFollowing(next);
    try {
      const res = await fetch(`/api/users/${ownerId}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      }
    } catch {
      setFollowing(!next);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-[#EAECF0] overflow-hidden bg-white shadow-sm">
        {/* Mosaic — click opens detail */}
        <div className="relative h-44 cursor-pointer" onClick={() => setShowDetail(true)}>
          <CollectionMosaic ids={ids} allExperiences={allExperiences} resolvedExperiences={collection._experiences} />
          {tags.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 flex-wrap max-w-[75%]">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                  style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pt-3">
          {/* Author + follow */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[10px] font-bold text-[#667085]">
                {initials}
              </div>
              <span className="text-[#667085] text-sm">{ownerHandle ?? "unknown"}</span>
            </div>
            {ownerId && (
              <button
                onClick={handleFollow}
                className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${
                  following
                    ? "border-[#667085] text-[#667085] bg-[#F9FAFB]"
                    : "border-[#101828] text-[#101828]"
                }`}
              >
                {following ? "Following" : "+ Follow"}
              </button>
            )}
          </div>

          {/* Title + save heart */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowDetail(true)}>
              <p className="text-[#101828] text-base font-semibold leading-snug">{collection.name}</p>
              <p className="text-[#667085] text-xs mt-0.5">{count} {count === 1 ? "experience" : "experiences"}</p>
            </div>
            <button className="w-8 h-8 rounded-full border border-[#EAECF0] flex items-center justify-center shrink-0 mt-0.5">
              <Heart size={14} className="text-[#667085]" />
            </button>
          </div>

          {/* Reactions + Plan my day */}
          <div className="flex items-center gap-2 pt-3 pb-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-colors ${
                liked
                  ? "border-[#E8405A] text-[#E8405A] bg-[#FFF0F3]"
                  : "border-[#EAECF0] text-[#667085]"
              }`}
            >
              <Heart size={13} fill={liked ? "currentColor" : "none"} />
              <span>{likeCount}</span>
            </button>
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#EAECF0] text-sm text-[#667085]"
            >
              <MessageCircle size={13} />
              <span>{commentCount}</span>
            </button>
            <Link
              href={planUrl}
              className="ml-auto flex items-center gap-1 text-sm font-semibold text-[#E8405A]"
            >
              → Plan my day
            </Link>
          </div>
        </div>
      </div>

      {showComments && (
        <CommentsSheet
          collectionId={collection.id}
          onClose={() => {
            setShowComments(false);
            fetch(`/api/collections/${collection.id}/comments`)
              .then((r) => r.json())
              .then((data) => { if (Array.isArray(data)) setCommentCount(data.length); })
              .catch(() => {});
          }}
        />
      )}

      {showDetail && (
        <div className="fixed inset-0 z-[700] bg-white overflow-y-auto">
          {selectedExp ? (
            <ExperienceDetail experience={selectedExp} onBack={() => setSelectedExp(null)} />
          ) : (
            <>
              <div className="sticky top-0 bg-white border-b border-[#EAECF0] px-4 py-3 flex items-center gap-3 z-10">
                <div className="h-[44px]" />
                <button onClick={() => setShowDetail(false)} className="p-1">
                  <ChevronLeft size={22} className="text-[#101828]" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#101828] truncate">{collection.name}</p>
                  <p className="text-xs text-[#667085]">{count} {count === 1 ? "experience" : "experiences"}</p>
                </div>
              </div>
              {(collection._experiences ?? []).length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <p className="text-[#667085] text-sm">No experiences in this collection yet.</p>
                </div>
              ) : (
                <div className="px-4 pt-4 pb-28 flex gap-2">
                  {[
                    (collection._experiences ?? []).filter((_, i) => i % 2 === 0),
                    (collection._experiences ?? []).filter((_, i) => i % 2 === 1),
                  ].map((col, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-2">
                      {col.map((exp) => (
                        <ExperienceCard
                          key={exp.id}
                          experience={exp}
                          compact
                          className="!aspect-auto !rounded-xl h-[200px]"
                          onClick={() => setSelectedExp(exp)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

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

import React from "react";

function CollectionsPageInner() {
  const searchParams = useSearchParams();
  const initialTab: CollectionsPageTab =
    searchParams.get("tab") === "mine" ? "mine" : "browse";

  const [activeTab, setActiveTab] = useState<CollectionsPageTab>(initialTab);
  const [activeFilter, setActiveFilter] = useState("All");
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);

  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [savedCollections, setSavedCollections] = useState<SavedCollection[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myLoaded, setMyLoaded] = useState(false);

  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);

  const loadingRef = useRef(false);

  useEffect(() => {
    if (allExperiences.length > 0) return;
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((data: DiscoveryResponse) => {
        setAllExperiences(Object.values(data.experiences ?? {}).flat());
      })
      .catch(() => {});
  }, [allExperiences.length]);

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
    { id: "mine", label: "Mine" },
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
      ) : activeTab === "following" ? (
        <FollowingTab allExperiences={allExperiences} />
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

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="bg-white min-h-screen" />}>
      <CollectionsPageInner />
    </Suspense>
  );
}
