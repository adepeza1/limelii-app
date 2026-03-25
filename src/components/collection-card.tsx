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
  fromHandle?: string; // set when this is a saved-from-others collection
  onClick: () => void;
}

export function CollectionCard({ collection, fromHandle, onClick }: CollectionCardProps) {
  const count = collection.experience_ids?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left"
    >
      {/* Stacked card effect */}
      <div className="relative h-[88px]">
        {/* Back card 2 */}
        <div className="absolute inset-x-4 top-3 h-full rounded-2xl bg-[#FFF0F3] border border-[#FFD6DE]" />
        {/* Back card 1 */}
        <div className="absolute inset-x-2 top-1.5 h-full rounded-2xl bg-[#FFE4EA] border border-[#FFBFCC]" />
        {/* Front card */}
        <div className="relative h-full rounded-2xl bg-white border border-[#EAECF0] shadow-sm px-4 flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#FFF0F3] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FB6983" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[#101828] text-sm font-semibold truncate">{collection.name}</p>
            <p className="text-[#667085] text-xs mt-0.5">
              {count} {count === 1 ? "experience" : "experiences"}
              {fromHandle && (
                <span className="text-[#98A2B3]"> · by @{fromHandle}</span>
              )}
            </p>
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
  onClick,
}: {
  savedCollection: SavedCollection;
  onClick: () => void;
}) {
  return (
    <CollectionCard
      collection={savedCollection.collection}
      fromHandle={savedCollection.collection.owner_handle}
      onClick={onClick}
    />
  );
}
