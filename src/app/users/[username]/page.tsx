"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Collection } from "@/lib/collections";
import type { Experience, DiscoveryResponse } from "@/app/page";
import { API_BASE } from "@/lib/xano";
import { BrowseCollectionCard, getTagsForCollection } from "@/components/browse-collection-card";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${encodeURIComponent(username)}`).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/discovery`).then((r) => r.json()).catch(() => ({ experiences: {} })),
    ]).then(([cols, discoveryData]) => {
      setCollections(Array.isArray(cols) ? cols : []);
      setAllExperiences(Object.values((discoveryData as DiscoveryResponse).experiences ?? {}).flat() as Experience[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  const initials = username ? username.slice(0, 2).toUpperCase() : "?";

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="h-[44px]" />

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-[#EAECF0]">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft size={22} className="text-[#101828]" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center text-sm font-bold text-[#667085] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#101828] text-base leading-tight">@{username}</p>
            {!loading && (
              <p className="text-xs text-[#667085]">
                {collections.length} {collections.length === 1 ? "collection" : "collections"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-5 py-16 flex items-center justify-center">
          <p className="text-sm text-[#667085]">Loading…</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-[#101828] font-semibold text-base">No public collections</p>
          <p className="text-[#667085] text-sm max-w-[240px]">
            {username} hasn&apos;t shared any collections yet.
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
