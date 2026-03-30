"use client";

import type { Collection, SavedCollection } from "@/lib/collections";

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

interface CollectionCardProps {
  collection: Collection;
  fromHandle?: string;
  tags?: string[];
  onClick: () => void;
}

export function CollectionCard({ collection, fromHandle, tags, onClick }: CollectionCardProps) {
  let ids: number[] = [];
  if (Array.isArray(collection.experience_ids)) ids = collection.experience_ids;
  else if (typeof collection.experience_ids === "string") {
    try { ids = JSON.parse(collection.experience_ids); } catch { ids = []; }
  }
  const count = ids.length;
  const ownerHandle = fromHandle ?? collection.owner_handle;

  return (
    <button onClick={onClick} className="w-full text-left">
      {/* Stacked card effect */}
      <div className="relative h-auto min-h-[88px]">
        {/* Back card 2 */}
        <div className="absolute inset-x-4 top-3 bottom-0 rounded-2xl bg-[#FFF0F3] border border-[#FFD6DE]" />
        {/* Back card 1 */}
        <div className="absolute inset-x-2 top-1.5 bottom-0 rounded-2xl bg-[#FFE4EA] border border-[#FFBFCC]" />
        {/* Front card */}
        <div className="relative rounded-2xl bg-white border border-[#EAECF0] shadow-sm px-4 py-3.5 flex items-start gap-3">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[#101828] text-sm font-semibold truncate">{collection.name}</p>
            <p className="text-[#667085] text-xs mt-0.5">
              {count} {count === 1 ? "experience" : "experiences"}
              {ownerHandle && (
                <span className="text-[#98A2B3]"> · by @{ownerHandle}</span>
              )}
            </p>
            {tags && tags.length > 0 && (
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

          {/* Visibility badge */}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full shrink-0 ${
            collection.is_public
              ? "bg-[#ECFDF3] text-[#027A48]"
              : "bg-[#F2F4F7] text-[#667085]"
          }`}>
            {collection.is_public ? <GlobeIcon /> : <LockIcon />}
            {collection.is_public ? "Public" : "Private"}
          </div>
        </div>
      </div>
    </button>
  );
}

export function SavedCollectionCard({
  savedCollection,
  tags,
  onClick,
}: {
  savedCollection: SavedCollection;
  tags?: string[];
  onClick: () => void;
}) {
  return (
    <CollectionCard
      collection={savedCollection.collection}
      fromHandle={savedCollection.collection.owner_handle}
      tags={tags}
      onClick={onClick}
    />
  );
}
