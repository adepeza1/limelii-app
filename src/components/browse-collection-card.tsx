"use client";

import { useState, useEffect, useRef } from "react";
import { useBackHandler } from "@/hooks/useBackHandler";
import Link from "next/link";
import { Heart, MessageCircle, X, Send, ChevronLeft, Trash2, MapPin, ChevronRight, MoreVertical, Lock, Globe } from "lucide-react";
import { useToast } from "@/components/toast";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceDetail } from "@/components/experience-detail";
import { CollectionShareSheet } from "@/components/collection-share-sheet";
import { ReportModal } from "@/components/report-modal";
import type { Experience } from "@/app/page";
import type { Collection } from "@/lib/collections";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export function getExpImage(exp: Experience): string | null {
  for (const p of exp.places_id ?? []) {
    const url =
      (p.display_images ?? []).find((img) => img.url)?.url ??
      (p.images ?? []).find((img) => img.url)?.url;
    if (url) return url;
  }
  return null;
}

export function parseExperienceIds(collection: Collection): number[] {
  if (Array.isArray(collection.experience_ids)) return collection.experience_ids as unknown as number[];
  if (typeof collection.experience_ids === "string") {
    try { return JSON.parse(collection.experience_ids); } catch { return []; }
  }
  return [];
}

function resolveExperiences(collection: Collection, allExperiences: Experience[]): Experience[] {
  // Prefer allExperiences (full image data from discovery feed) for any IDs that appear there.
  // _experiences may carry partial data (no display_images) for user-created entries;
  // only append the entries whose IDs are NOT already in the feed.
  const embedded = collection._experiences ?? [];
  if (embedded.length === 0) return allExperiences;
  const feedIds = new Set(allExperiences.map((e) => e.id));
  const createdOnly = embedded.filter((e) => !feedIds.has(e.id));
  return [...allExperiences, ...createdOnly];
}

export function getTagsForCollection(collection: Collection, allExperiences: Experience[]): string[] {
  const ids = new Set(parseExperienceIds(collection));
  const pool = resolveExperiences(collection, allExperiences);
  const activities = new Set<string>();
  for (const exp of pool) {
    if (!ids.has(exp.id)) continue;
    for (const act of exp.activities ?? []) {
      activities.add(act);
      if (activities.size >= 4) break;
    }
    if (activities.size >= 4) break;
  }
  return Array.from(activities).slice(0, 4);
}

export function getCollectionLocationHint(
  collection: Collection,
  allExperiences: Experience[]
): string | null {
  const ids = new Set(parseExperienceIds(collection));
  const pool = resolveExperiences(collection, allExperiences);
  const seen = new Set<string>();
  const neighborhoods: string[] = [];
  for (const exp of pool) {
    if (!ids.has(exp.id)) continue;
    for (const place of exp.places_id ?? []) {
      const loc = (place.neighborhood || place.borough)?.trim();
      const key = loc?.toLowerCase();
      if (loc && key && !seen.has(key)) { seen.add(key); neighborhoods.push(loc); }
    }
  }
  return neighborhoods.length > 0 ? neighborhoods.join(" · ") : null;
}

export function relativeTime(ts: number): string {
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

export function CollectionMosaic({ ids, allExperiences, resolvedExperiences }: { ids: number[]; allExperiences: Experience[]; resolvedExperiences?: Experience[] }) {
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

export function CommentsSheet({
  collectionId,
  onClose,
}: {
  collectionId: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/collections/${collectionId}/comments`)
      .then((r) => r.ok ? r.json() : [])
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
      } else {
        toast("Couldn't post comment", "error");
      }
    } catch {
      toast("Couldn't post comment", "error");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: number) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      const res = await fetch(`/api/collections/${collectionId}/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback — re-fetch authoritative list
      fetch(`/api/collections/${collectionId}/comments`)
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setComments(Array.isArray(data) ? data : []))
        .catch(() => {});
      toast("Couldn't delete comment", "error");
    }
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

export function BrowseCollectionCard({
  collection,
  allExperiences,
  tags,
  hideFollow,
  currentUserId,
  followedIds,
  onDeleted,
}: {
  collection: Collection;
  allExperiences: Experience[];
  tags: string[];
  hideFollow?: boolean;
  currentUserId?: number | null;
  followedIds?: number[] | null;
  onDeleted?: () => void;
}) {
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = collection as any;

  const LIKED_KEY = "limelii_liked_collections";
  function getLikedIds(): number[] {
    try { return JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]"); } catch { return []; }
  }

  const FOLLOWED_KEY = "limelii_followed_users";
  function getFollowedIds(): number[] {
    try { return JSON.parse(localStorage.getItem(FOLLOWED_KEY) ?? "[]"); } catch { return []; }
  }

  const ownerIdForFollow: number | undefined = collection._users?.id ?? (col.users_id as number | undefined);

  const [liked, setLiked] = useState<boolean>(() => getLikedIds().includes(collection.id));
  const [likeCount, setLikeCount] = useState<number>(col.likes_count ?? 0);
  const [following, setFollowing] = useState<boolean>(() => {
    // Prefer the server-authoritative prop; fall back to localStorage cache
    if (followedIds != null) return ownerIdForFollow != null ? followedIds.includes(ownerIdForFollow) : false;
    return ownerIdForFollow != null ? getFollowedIds().includes(ownerIdForFollow) : false;
  });

  // Sync when the server-confirmed followedIds prop arrives after mount
  useEffect(() => {
    if (followedIds != null && ownerIdForFollow != null) {
      setFollowing(followedIds.includes(ownerIdForFollow));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followedIds]);

  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(col.comments_count ?? 0);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedExp, setSelectedExp] = useState<Experience | null>(null);
  // Extra experiences fetched individually for IDs not found in the discovery feed.
  const [extraExperiences, setExtraExperiences] = useState<Experience[]>([]);
  const mosaicLoadedRef = useRef(false);
  const detailLoadedRef = useRef(false);

  // On mount: if _experiences is populated (profile page Xano join) and has IDs missing
  // from the discovery feed, fetch up to 3 of them so the mosaic can show real images.
  // Xano's db.query join doesn't include the places_id relationship, so getExpImage()
  // returns null on the bare _experiences objects — we need the individually-fetched version.
  useEffect(() => {
    if (mosaicLoadedRef.current) return;
    const embedded = collection._experiences;
    if (!embedded || embedded.length === 0) return;
    const feedIds = new Set(allExperiences.map((e) => e.id));
    const missingIds = embedded
      .filter((e) => !feedIds.has(e.id))
      .map((e) => e.id)
      .slice(0, 3);
    if (missingIds.length === 0) return;
    mosaicLoadedRef.current = true;
    Promise.all(
      missingIds.map((id) =>
        fetch(`/api/experiences/${id}`)
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then((results) => {
      const fetched = results.filter(Boolean) as Experience[];
      if (fetched.length > 0) setExtraExperiences(fetched);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When detail opens, fetch ALL missing IDs not already loaded (mosaic may have fetched some).
  // /api/collections/${id} is owner-gated in Xano so we fetch individually instead.
  useEffect(() => {
    if (!showDetail || detailLoadedRef.current) return;
    detailLoadedRef.current = true;
    const feedIds = new Set(allExperiences.map((e) => e.id));
    const extraIds = new Set(extraExperiences.map((e) => e.id));
    const missingIds = parseExperienceIds(collection).filter(
      (id) => !feedIds.has(id) && !extraIds.has(id)
    );
    if (missingIds.length === 0) return;
    Promise.all(
      missingIds.map((id) =>
        fetch(`/api/experiences/${id}`)
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then((results) => {
      const fetched = results.filter(Boolean) as Experience[];
      if (fetched.length > 0) setExtraExperiences((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        return [...prev, ...fetched.filter((e) => !existingIds.has(e.id))];
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDetail]);

  useBackHandler(showDetail, () => {
    if (selectedExp) {
      setSelectedExp(null);
    } else {
      setShowDetail(false);
    }
  });

  const ids = parseExperienceIds(collection);
  const count = ids.length;
  const ownerHandle = collection._users?.username ?? collection.owner_handle;
  const ownerId = collection._users?.id ?? col.users_id;

  // Xano image fields can be a plain URL string or a file object {url: string}.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractUrl(val: any): string | null {
    if (!val) return null;
    if (typeof val === "string") return val || null;
    if (typeof val === "object" && typeof val.url === "string") return val.url || null;
    return null;
  }
  const ownerPhoto =
    extractUrl(collection._users?.photo) ??
    extractUrl(collection._users?.profile_photo_url) ??
    extractUrl(collection._users?.picture);
  const initials = ownerHandle ? ownerHandle.slice(0, 2).toUpperCase() : "?";
  const [isPublic, setIsPublic] = useState(collection.is_public);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showKebab, setShowKebab] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportKebab, setShowReportKebab] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const planUrl = collection.id ? `/plan?collection_id=${collection.id}` : "/plan";
  const locationHint = getCollectionLocationHint(collection, allExperiences);
  const subtitle = locationHint ?? `${count} ${count === 1 ? "experience" : "experiences"}`;

  async function handleLike() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev) => nextLiked ? prev + 1 : prev - 1);
    const ids = getLikedIds().filter((id) => id !== collection.id);
    if (nextLiked) ids.push(collection.id);
    localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
    try {
      const res = await fetch(`/api/collections/${collection.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.count);
        const synced = getLikedIds().filter((id) => id !== collection.id);
        if (data.liked) synced.push(collection.id);
        localStorage.setItem(LIKED_KEY, JSON.stringify(synced));
      }
    } catch {
      setLiked(liked);
      setLikeCount((prev) => nextLiked ? prev - 1 : prev + 1);
      const reverted = getLikedIds().filter((id) => id !== collection.id);
      if (liked) reverted.push(collection.id);
      localStorage.setItem(LIKED_KEY, JSON.stringify(reverted));
      toast("Couldn't update like", "error");
    }
  }

  async function handleFollow() {
    if (!ownerId) return;
    const next = !following;
    setFollowing(next);
    // Optimistically update localStorage
    const ids = getFollowedIds().filter((id) => id !== ownerId);
    if (next) ids.push(ownerId);
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(ids));
    try {
      const res = await fetch(`/api/users/${ownerId}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        // Sync localStorage with confirmed server state
        const synced = getFollowedIds().filter((id) => id !== ownerId);
        if (data.following) synced.push(ownerId);
        localStorage.setItem(FOLLOWED_KEY, JSON.stringify(synced));
      } else {
        // Revert
        setFollowing(!next);
        const reverted = getFollowedIds().filter((id) => id !== ownerId);
        if (!next) reverted.push(ownerId);
        localStorage.setItem(FOLLOWED_KEY, JSON.stringify(reverted));
      }
    } catch {
      setFollowing(!next);
      const reverted = getFollowedIds().filter((id) => id !== ownerId);
      if (!next) reverted.push(ownerId);
      localStorage.setItem(FOLLOWED_KEY, JSON.stringify(reverted));
      toast(`Couldn't ${next ? "follow" : "unfollow"} user`, "error");
    }
  }

  async function handleDeleteCollection() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setShowDeleteConfirm(false);
        if (onDeleted) {
          onDeleted();
        } else {
          setDeleted(true);
        }
      } else {
        toast("Couldn't delete collection", "error");
      }
    } catch {
      toast("Couldn't delete collection", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePrivacy() {
    setTogglingPrivacy(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: collection.name, is_public: !isPublic }),
      });
      if (res.ok) {
        setIsPublic((prev) => !prev);
        setShowPrivacyConfirm(false);
      } else {
        toast("Couldn't update visibility", "error");
      }
    } catch {
      toast("Couldn't update visibility", "error");
    } finally {
      setTogglingPrivacy(false);
    }
  }

  if (deleted) return null;

  return (
    <>
      <div className="rounded-xl border border-[#EAECF0] overflow-hidden bg-white shadow-sm">
        {/* Mosaic — click opens detail */}
        <div className="relative h-44 cursor-pointer" onClick={() => setShowDetail(true)}>
          <CollectionMosaic ids={ids} allExperiences={[...allExperiences, ...extraExperiences]} />
        </div>

        <div className="px-4 pt-3">
          {/* Author + follow */}
          <div className="flex items-center justify-between mb-2.5">
            <Link
              href={currentUserId && currentUserId === ownerId ? "/profile" : ownerHandle ? `/u/${encodeURIComponent(ownerHandle)}` : "#"}
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-7 h-7 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[10px] font-bold text-[#667085] overflow-hidden shrink-0">
                {ownerPhoto
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={ownerPhoto} alt={ownerHandle ?? ""} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <span className="text-[#667085] text-sm">{ownerHandle ?? "unknown"}</span>
            </Link>
            {currentUserId && currentUserId === ownerId ? (
              <div className="relative">
                <button
                  onClick={() => setShowKebab((v) => !v)}
                  className="p-1.5 rounded-full text-[#98A2B3] hover:bg-[#F2F4F7] transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical size={16} />
                </button>
                {showKebab && (
                  <>
                    <div className="fixed inset-0 z-[10]" onClick={() => setShowKebab(false)} />
                    <div className="absolute right-0 top-8 z-[20] bg-white border border-[#EAECF0] rounded-xl shadow-lg py-1 min-w-[160px]">
                      <button
                        onClick={() => { setShowKebab(false); setShowPrivacyConfirm(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#344054] flex items-center gap-2"
                      >
                        {isPublic ? <Lock size={14} /> : <Globe size={14} />}
                        {isPublic ? "Make private" : "Make public"}
                      </button>
                      <div className="h-px bg-[#F2F4F7] mx-2" />
                      <button
                        onClick={() => { setShowKebab(false); setShowDeleteConfirm(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#E8405A] flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : !hideFollow && ownerId && currentUserId && currentUserId !== ownerId ? (
              <div className="flex items-center gap-2">
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
                <button
                  aria-label="More options"
                  onClick={() => setShowReportKebab(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Title */}
          <div className="cursor-pointer" onClick={() => setShowDetail(true)}>
            <p className="text-[#101828] text-base font-semibold leading-snug">{collection.name}</p>
            <p className="text-[#667085] text-xs mt-0.5">{subtitle}</p>
          </div>

          {/* Tag pills */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F2F4F7] text-[#667085]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-2 pt-3">
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
            <button
              onClick={() => setShowShareSheet(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#EAECF0] text-sm text-[#667085]"
              aria-label="Share collection"
            >
              <Send size={13} />
            </button>
          </div>

          {/* Explore link */}
          <Link
            href={planUrl}
            className="w-full mt-3 mb-4 flex items-center justify-center gap-1 text-sm font-normal text-[#E8405A]"
          >
            Explore Map
            <ChevronRight size={14} strokeWidth={1.75} />
          </Link>
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

      {showShareSheet && (
        <CollectionShareSheet
          collectionId={collection.id}
          collectionName={collection.name}
          onClose={() => setShowShareSheet(false)}
          shareUrl={typeof window !== "undefined"
            ? collection.share_token
              ? `${window.location.origin}/c/${collection.share_token}`
              : `${window.location.origin}/c/${collection.id}`
            : undefined}
        />
      )}

      {showPrivacyConfirm && (
        <>
          <div className="fixed inset-0 z-[950] bg-black/40" onClick={() => { if (!togglingPrivacy) setShowPrivacyConfirm(false); }} />
          <div className="fixed inset-0 z-[951] flex items-center justify-center px-6 pointer-events-none">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl pointer-events-auto">
              <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-4">
                {isPublic ? <Lock size={18} className="text-[#344054]" /> : <Globe size={18} className="text-[#344054]" />}
              </div>
              <h2 className="text-[#101828] font-semibold text-base mb-1">
                {isPublic ? "Make collection private?" : "Make collection public?"}
              </h2>
              <p className="text-[#667085] text-sm mb-5">
                {isPublic
                  ? "Only you will be able to see this collection. It will no longer appear in Browse."
                  : "This collection will be visible to everyone and appear in Browse."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrivacyConfirm(false)}
                  disabled={togglingPrivacy}
                  className="flex-1 py-2.5 rounded-xl border border-[#D0D5DD] text-sm font-semibold text-[#344054] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTogglePrivacy}
                  disabled={togglingPrivacy}
                  className="flex-1 py-2.5 rounded-xl bg-[#101828] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {togglingPrivacy ? "Saving…" : isPublic ? "Make private" : "Make public"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 z-[950] bg-black/40" onClick={() => { if (!deleting) setShowDeleteConfirm(false); }} />
          <div className="fixed inset-0 z-[951] flex items-center justify-center px-6 pointer-events-none">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl pointer-events-auto">
              <h2 className="text-[#101828] font-semibold text-base mb-1">Delete collection?</h2>
              <p className="text-[#667085] text-sm mb-5">
                &ldquo;{collection.name}&rdquo; will be permanently deleted. This can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl border border-[#D0D5DD] text-sm font-semibold text-[#344054] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCollection}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-[#E8405A] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showReportKebab && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-end" onClick={(e) => { if (e.target === e.currentTarget) setShowReportKebab(false); }}>
          <div className="w-full bg-white rounded-t-2xl px-4 pt-4 pb-10 safe-bottom">
            <button
              onClick={() => { setShowReportKebab(false); setShowReportModal(true); }}
              className="w-full flex items-center py-3.5 px-2 text-sm font-medium text-red-500"
            >
              Report collection
            </button>
            <button
              onClick={() => setShowReportKebab(false)}
              className="w-full flex items-center py-3.5 px-2 text-sm font-medium text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          type="collection"
          targetId={collection.id}
          targetName={collection.name}
          onClose={() => setShowReportModal(false)}
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
              {(() => {
                // Merge: discovery (full image data) + individually-fetched user-created
                const mergedPool = [...allExperiences, ...extraExperiences];
                const detailExps = parseExperienceIds(collection)
                  .map((id) => mergedPool.find((e) => e.id === id))
                  .filter(Boolean) as Experience[];
                return detailExps.length === 0 ? (
                  <div className="px-5 py-16 text-center">
                    <p className="text-[#667085] text-sm">No experiences in this collection yet.</p>
                  </div>
                ) : (
                  <div className="px-4 pt-4 pb-28 flex gap-1 items-start">
                    {[
                      detailExps.filter((_, i) => i % 2 === 0),
                      detailExps.filter((_, i) => i % 2 === 1),
                    ].map((col, colIdx) => (
                      <div key={colIdx} className="flex-1 flex flex-col gap-1">
                        {col.map((exp, rowIdx) => {
                          const isTall = colIdx === 0 ? rowIdx % 2 === 0 : rowIdx % 2 === 1;
                          return (
                            <ExperienceCard
                              key={exp.id}
                              experience={exp}
                              compact
                              className={`!aspect-auto !rounded-xl ${isTall ? "h-[220px]" : "h-[188px]"}`}
                              onClick={() => setSelectedExp(exp)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </>
  );
}
