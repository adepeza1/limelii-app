"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Lock, MapPin } from "lucide-react";
import type { Collection } from "@/lib/collections";
import type { Experience, DiscoveryResponse } from "@/app/page";
import { API_BASE } from "@/lib/xano";
import { saveSharedCollection } from "@/lib/collections";

type SharedCollectionData = Collection;

export default function SharedCollectionPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [collection, setCollection] = useState<SharedCollectionData | null>(null);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null | undefined>(undefined); // undefined = not yet loaded
  const [isOwner, setIsOwner] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [autoSave, setAutoSave] = useState(false);

  // Detect ?autosave=1 param (set by login redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autosave") === "1") {
      setAutoSave(true);
      // Clean up the URL so a refresh doesn't re-trigger
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  // Load current user (undefined = loading, null = logged out, number = logged in)
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => setCurrentUserId(u?.id ?? null))
      .catch(() => setCurrentUserId(null));
  }, []);

  // Load collection + experiences
  useEffect(() => {
    Promise.all([
      fetch(`/api/c/${encodeURIComponent(token)}`).then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      }),
      fetch(`${API_BASE}/discovery`).then((r) => r.json()).catch(() => ({ experiences: {} })),
    ]).then(([col, discoveryData]) => {
      if (col) setCollection(col);
      setAllExperiences(Object.values((discoveryData as DiscoveryResponse).experiences ?? {}).flat() as Experience[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  // Determine ownership
  useEffect(() => {
    if (collection && currentUserId != null) {
      setIsOwner(collection.owner_user_id === currentUserId);
    }
  }, [collection, currentUserId]);

  // Auto-save after login redirect
  useEffect(() => {
    if (!autoSave || !collection || currentUserId == null || currentUserId === undefined) return;
    if (isOwner || saveState !== "idle") return;
    setSaveState("saving");
    saveSharedCollection(collection.id)
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  }, [autoSave, collection, currentUserId, isOwner, saveState]);

  const handleSave = useCallback(async () => {
    if (!collection || saveState !== "idle") return;
    setSaveState("saving");
    try {
      await saveSharedCollection(collection.id);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  }, [collection, saveState]);

  const loginUrl = `/login?redirect_to=${encodeURIComponent(`/c/${token}?autosave=1`)}`;
  const ownerHandle = collection?._users?.username;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractUrl(val: any): string | null {
    if (!val) return null;
    if (typeof val === "string") return val || null;
    if (typeof val === "object" && typeof val.url === "string") return val.url || null;
    return null;
  }
  const ownerPhoto =
    extractUrl(collection?._users?.photo) ??
    extractUrl(collection?._users?.profile_photo_url) ??
    extractUrl(collection?._users?.picture);

  const resolvedIds: number[] = (() => {
    const raw = collection?.experience_ids;
    if (Array.isArray(raw)) return raw as unknown as number[];
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
    return [];
  })();

  const resolvedExperiences: Experience[] = (() => {
    const embedded = collection?._experiences ?? [];
    const feedIds = new Set(allExperiences.map((e) => e.id));
    const idSet = new Set(resolvedIds);
    const fromFeed = allExperiences.filter((e) => idSet.has(e.id));
    const createdOnly = embedded.filter((e) => !feedIds.has(e.id) && idSet.has(e.id));
    return [...fromFeed, ...createdOnly];
  })();

  const isLoggedOut = currentUserId === null;

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[env(safe-area-inset-top,44px)]" />

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-[#EAECF0]">
        <button onClick={() => router.back()} className="p-1 shrink-0">
          <ChevronLeft size={22} className="text-[#101828]" />
        </button>
        <p className="font-semibold text-[#101828] text-base truncate">
          {collection?.name ?? "Shared Collection"}
        </p>
      </div>

      {loading ? (
        <div className="px-5 py-16 flex items-center justify-center">
          <p className="text-sm text-[#667085]">Loading…</p>
        </div>
      ) : notFound ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-[#101828] font-semibold text-base">Collection not found</p>
          <p className="text-[#667085] text-sm">This link may have expired or been removed.</p>
        </div>
      ) : collection ? (
        <>
          {/* Collection info */}
          <div className="px-5 pt-5 pb-4 border-b border-[#EAECF0]">
            <div className="flex items-start gap-3">
              {!collection.is_public && (
                <div className="mt-0.5 w-8 h-8 rounded-xl bg-[#F2F4F7] flex items-center justify-center shrink-0">
                  <Lock size={14} className="text-[#667085]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-[#101828] text-lg leading-tight">{collection.name}</h1>
                {collection.description && (
                  <p className="text-sm text-[#667085] mt-1 leading-snug">{collection.description}</p>
                )}
              </div>
            </div>

            {/* Owner */}
            {ownerHandle && (
              <button
                onClick={() => router.push(`/u/${encodeURIComponent(ownerHandle)}`)}
                className="mt-3 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[10px] font-bold text-[#667085] overflow-hidden shrink-0">
                  {ownerPhoto
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={ownerPhoto} alt={ownerHandle} className="w-full h-full object-cover" />
                    : ownerHandle.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-[#667085]">@{ownerHandle}</span>
              </button>
            )}

            <p className="text-xs text-[#98A2B3] mt-2">
              {resolvedExperiences.length} {resolvedExperiences.length === 1 ? "experience" : "experiences"}
            </p>

            {/* Save CTA — authenticated non-owner only */}
            {!isLoggedOut && !isOwner && (
              saveState === "saved" ? (
                <p className="mt-4 text-sm text-[#027A48] font-medium">Saved to your collections</p>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className={`mt-4 w-full py-3 rounded-2xl text-white font-semibold text-sm transition-colors disabled:opacity-50 ${
                    saveState === "error" ? "bg-red-500" : "bg-[#FB6983]"
                  }`}
                >
                  {saveState === "saving" ? "Saving…" : saveState === "error" ? "Try again" : "Save to my collections"}
                </button>
              )
            )}

            {isOwner && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-[#F9FAFB] border border-[#EAECF0] inline-flex items-center">
                <span className="text-xs text-[#667085]">Your collection</span>
              </div>
            )}
          </div>

          {/* Experiences grid — always visible */}
          {resolvedExperiences.length === 0 ? (
            <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
              <p className="text-[#101828] font-semibold text-base">No experiences yet</p>
              <p className="text-[#667085] text-sm max-w-[240px]">This collection doesn&apos;t have any experiences added yet.</p>
            </div>
          ) : (
            <div className={`px-4 pt-4 flex gap-1 items-start ${isLoggedOut ? "pb-40" : "pb-28"}`}>
              {[
                resolvedExperiences.filter((_, i) => i % 2 === 0),
                resolvedExperiences.filter((_, i) => i % 2 === 1),
              ].map((col, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-1">
                  {col.map((exp, rowIdx) => {
                    const isTall = colIdx === 0 ? rowIdx % 2 === 0 : rowIdx % 2 === 1;
                    const place = exp.places_id?.[0];
                    const photo =
                      place?.display_images?.[0]?.url ??
                      (place?.images as { url: string }[] | undefined)?.[0]?.url;
                    return (
                      <div
                        key={exp.id}
                        className={`relative rounded-xl overflow-hidden bg-[#F2F4F7] ${isTall ? "h-[220px]" : "h-[188px]"}`}
                      >
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={exp.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{exp.title}</p>
                          {exp.places_id?.[0]?.neighborhood && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <MapPin size={9} className="text-white/70" />
                              <p className="text-white/70 text-[10px]">{exp.places_id[0].neighborhood}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Persistent sign-up CTA for unauthenticated users */}
      {isLoggedOut && !loading && !notFound && (
        <div className="fixed bottom-0 left-0 right-0 z-[800] max-w-5xl mx-auto bg-white border-t border-[#EAECF0] px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          <p className="text-sm font-semibold text-[#101828] mb-0.5">Save this collection to limelii</p>
          <p className="text-xs text-[#667085] mb-3">Sign up free to save, follow, and share collections.</p>
          <button
            onClick={() => router.push(loginUrl)}
            className="w-full py-3 rounded-2xl bg-[#FB6983] text-white font-semibold text-sm"
          >
            Sign up / Log in
          </button>
        </div>
      )}
    </div>
  );
}
