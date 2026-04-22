"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, MoreVertical } from "lucide-react";
import type { Collection } from "@/lib/collections";
import type { Experience, DiscoveryResponse } from "@/app/page";
import { API_BASE } from "@/lib/xano";
import { BrowseCollectionCard, getTagsForCollection } from "@/components/browse-collection-card";
import { ReportModal } from "@/components/report-modal";

interface PublicProfile {
  id: number;
  name: string;
  username: string;
  photo?: string;
  profile_photo_url?: string;
  picture?: string;
  bio?: string;
  neighborhood?: string;
  follower_count: number;
  following_count: number;
  collections: Collection[];
}

const FOLLOWED_KEY = "limelii_followed_users";
function getFollowedIds(): number[] {
  try { return JSON.parse(localStorage.getItem(FOLLOWED_KEY) ?? "[]"); } catch { return []; }
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [followedIds, setFollowedIds] = useState<number[] | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);
  const [showUserKebab, setShowUserKebab] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Load current user + seed follow state
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        if (u?.id) {
          setCurrentUserId(u.id);
          // If this is the user's own profile, redirect to private profile
          fetch(`/api/users/${encodeURIComponent(username)}/profile`)
            .then((r) => r.ok ? r.json() : null)
            .then((p) => {
              if (p?.id && p.id === u.id) {
                router.replace("/profile");
              }
            })
            .catch(() => {});
          // Seed followed IDs from server
          fetch("/api/users/me/following")
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (Array.isArray(data?.followingIds)) setFollowedIds(data.followingIds); })
            .catch(() => setFollowedIds([]));
        } else {
          setFollowedIds([]);
        }
      })
      .catch(() => setFollowedIds([]));
  }, [username, router]);

  // Load profile + experiences
  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${encodeURIComponent(username)}/profile`).then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      }),
      fetch(`${API_BASE}/discovery`).then((r) => r.json()).catch(() => ({ experiences: {} })),
    ]).then(([p, discoveryData]) => {
      if (p) {
        setProfile(p);
        setFollowerCount(p.follower_count ?? 0);
        // Init following state: server followedIds if available, else localStorage
        setFollowing(
          followedIds != null
            ? followedIds.includes(p.id)
            : getFollowedIds().includes(p.id)
        );
      }
      setAllExperiences(Object.values((discoveryData as DiscoveryResponse).experiences ?? {}).flat() as Experience[]);
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Sync following state when server followedIds arrive
  useEffect(() => {
    if (followedIds != null && profile) {
      setFollowing(followedIds.includes(profile.id));
    }
  }, [followedIds, profile]);

  async function handleFollow() {
    if (!profile || followLoading) return;
    if (following) {
      setConfirmUnfollow(true);
      return;
    }
    setFollowLoading(true);
    const next = true;
    setFollowing(next);
    setFollowerCount((c) => c + 1);
    const ids = getFollowedIds().filter((id) => id !== profile.id);
    ids.push(profile.id);
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(ids));
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        if (!data.following) setFollowerCount((c) => c - 1);
        const synced = getFollowedIds().filter((id) => id !== profile.id);
        if (data.following) synced.push(profile.id);
        localStorage.setItem(FOLLOWED_KEY, JSON.stringify(synced));
      } else {
        setFollowing(false);
        setFollowerCount((c) => c - 1);
        const reverted = getFollowedIds().filter((id) => id !== profile.id);
        localStorage.setItem(FOLLOWED_KEY, JSON.stringify(reverted));
      }
    } catch {
      setFollowing(false);
      setFollowerCount((c) => c - 1);
      const reverted = getFollowedIds().filter((id) => id !== profile.id);
      localStorage.setItem(FOLLOWED_KEY, JSON.stringify(reverted));
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleUnfollow() {
    if (!profile || followLoading) return;
    setConfirmUnfollow(false);
    setFollowLoading(true);
    setFollowing(false);
    setFollowerCount((c) => c - 1);
    const ids = getFollowedIds().filter((id) => id !== profile.id);
    localStorage.setItem(FOLLOWED_KEY, JSON.stringify(ids));
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        if (data.following) setFollowerCount((c) => c + 1);
        const synced = getFollowedIds().filter((id) => id !== profile.id);
        if (data.following) synced.push(profile.id);
        localStorage.setItem(FOLLOWED_KEY, JSON.stringify(synced));
      } else {
        setFollowing(true);
        setFollowerCount((c) => c + 1);
        const reverted = getFollowedIds().filter((id) => id !== profile.id);
        reverted.push(profile.id);
        localStorage.setItem(FOLLOWED_KEY, JSON.stringify(reverted));
      }
    } catch {
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    } finally {
      setFollowLoading(false);
    }
  }

  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);
  const isOwnProfile = currentUserId != null && profile?.id === currentUserId;

  // Xano's by_username endpoint doesn't join _users onto collections.
  // Inject the profile owner's info so cards show the correct username/avatar.
  const collections: Collection[] = (profile?.collections ?? []).map((col) => ({
    ...col,
    _users: col._users ?? {
      id: profile!.id,
      username: profile!.username,
      photo: profile!.photo,
      profile_photo_url: profile!.profile_photo_url,
      picture: profile!.picture,
    },
  }));

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[env(safe-area-inset-top,44px)]" />

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-[#EAECF0]">
        <button onClick={() => router.back()} className="p-1 shrink-0">
          <ChevronLeft size={22} className="text-[#101828]" />
        </button>
        <p className="font-semibold text-[#101828] text-base">@{username}</p>
      </div>

      {loading ? (
        <div className="px-5 py-16 flex items-center justify-center">
          <p className="text-sm text-[#667085]">Loading…</p>
        </div>
      ) : notFound ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-[#101828] font-semibold text-base">User not found</p>
          <p className="text-[#667085] text-sm">That username doesn&apos;t exist.</p>
        </div>
      ) : profile ? (
        <>
          {/* Profile card */}
          <div className="px-5 pt-5 pb-4 border-b border-[#EAECF0]">
            {(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              function extractUrl(val: any): string | null {
                if (!val) return null;
                if (typeof val === "string") return val || null;
                if (typeof val === "object" && typeof val.url === "string") return val.url || null;
                return null;
              }
              const photoUrl =
                extractUrl(profile.photo) ??
                extractUrl(profile.profile_photo_url) ??
                extractUrl(profile.picture);
              const initials = username ? username.slice(0, 2).toUpperCase() : "?";

              return (
                <>
                  {/* Lightbox */}
                  {photoLightboxOpen && photoUrl && (
                    <div
                      className="fixed inset-0 z-[980] bg-black/90 flex items-center justify-center"
                      onClick={() => setPhotoLightboxOpen(false)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt={profile.username || username}
                        className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    {/* Avatar */}
                    <button
                      onClick={() => photoUrl && setPhotoLightboxOpen(true)}
                      className={`w-16 h-16 rounded-full bg-[#F2F4F7] flex items-center justify-center text-xl font-bold text-[#667085] shrink-0 overflow-hidden ${photoUrl ? "cursor-pointer" : "cursor-default"}`}
                      aria-label={photoUrl ? "View profile photo" : undefined}
                    >
                      {photoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={photoUrl} alt={profile.username || username} className="w-full h-full object-cover" />
                        : initials}
                    </button>

                    {/* Follow + options buttons */}
                    {!isOwnProfile && currentUserId && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleFollow}
                          disabled={followLoading}
                          className={`shrink-0 text-sm font-medium px-5 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                            following
                              ? "border-[#667085] text-[#667085] bg-[#F9FAFB]"
                              : "border-[#101828] text-[#101828]"
                          }`}
                        >
                          {following ? "Following" : "+ Follow"}
                        </button>
                        <button
                          aria-label="More options"
                          onClick={() => setShowUserKebab(true)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Name + bio */}
            <div className="mt-3">
              {profile.name && (
                <p className="font-semibold text-[#101828] text-base leading-tight">{profile.name}</p>
              )}
              {profile.bio && (
                <p className="mt-1 text-sm text-[#344054] leading-snug">{profile.bio}</p>
              )}
            </div>

            {/* Neighborhood */}
            {profile.neighborhood && (
              <div className="flex items-center gap-1 mt-1.5">
                <MapPin size={12} className="text-[#98A2B3]" />
                <p className="text-xs text-[#98A2B3]">{profile.neighborhood}</p>
              </div>
            )}

            {/* Follower / Following counts */}
            <div className="flex gap-4 mt-3">
              <span className="text-sm text-[#344054]">
                <span className="font-semibold text-[#101828]">{followerCount}</span> followers
              </span>
              <span className="text-sm text-[#344054]">
                <span className="font-semibold text-[#101828]">{profile.following_count}</span> following
              </span>
            </div>
          </div>

          {/* Collections */}
          {collections.length === 0 ? (
            <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
              <p className="text-[#101828] font-semibold text-base">No public collections</p>
              <p className="text-[#667085] text-sm max-w-[240px]">
                @{profile.username} hasn&apos;t shared any collections yet.
              </p>
            </div>
          ) : (
            <div className="px-5 pt-4 pb-28 flex flex-col gap-4">
              {collections.map((col) => (
                <BrowseCollectionCard
                  key={col.id}
                  collection={col}
                  allExperiences={allExperiences}
                  tags={getTagsForCollection(col, allExperiences)}
                  currentUserId={currentUserId}
                  followedIds={followedIds}
                  hideFollow
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Unfollow confirm dialog */}
      {confirmUnfollow && (
        <div className="fixed inset-0 z-[900] bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
            <div className="w-10 h-1 rounded-full bg-[#D0D5DD] mx-auto mb-5" />
            <p className="text-[#101828] font-semibold text-base text-center">Unfollow @{profile?.username}?</p>
            <p className="text-[#667085] text-sm text-center mt-1 mb-6">
              Their collections will no longer appear in your Following tab.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUnfollow}
                className="w-full py-3 rounded-2xl bg-[#E8405A] text-white font-semibold text-sm"
              >
                Unfollow
              </button>
              <button
                onClick={() => setConfirmUnfollow(false)}
                className="w-full py-3 rounded-2xl border border-[#EAECF0] text-[#344054] font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserKebab && (
        <div className="fixed inset-0 z-[900] bg-black/40 flex items-end" onClick={(e) => { if (e.target === e.currentTarget) setShowUserKebab(false); }}>
          <div className="w-full bg-white rounded-t-2xl px-4 pt-4 pb-10 safe-bottom">
            <button
              onClick={() => { setShowUserKebab(false); setShowReportModal(true); }}
              className="w-full flex items-center py-3.5 px-2 text-sm font-medium text-red-500"
            >
              Report user
            </button>
            <button
              onClick={async () => {
                setShowUserKebab(false);
                if (profile) {
                  await fetch(`/api/users/${profile.id}/block`, { method: "POST" });
                  setBlocked(true);
                }
              }}
              className="w-full flex items-center py-3.5 px-2 text-sm font-medium text-red-500"
            >
              Block user
            </button>
            <button
              onClick={() => setShowUserKebab(false)}
              className="w-full flex items-center py-3.5 px-2 text-sm font-medium text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReportModal && profile && (
        <ReportModal
          type="user"
          targetId={profile.id}
          targetName={profile.username}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {blocked && (
        <div className="fixed inset-0 z-[900] bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-[#101828] font-semibold text-base mb-1">User blocked</p>
            <p className="text-[#667085] text-sm mb-5">You won&apos;t see content from this user anymore.</p>
            <button
              onClick={() => router.back()}
              className="w-full py-3 rounded-xl bg-[#101828] text-white text-sm font-medium"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
