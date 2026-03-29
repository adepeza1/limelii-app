"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { Collection, SavedCollection } from "@/lib/collections";
import { createCollection } from "@/lib/collections";
import { CollectionCard, SavedCollectionCard } from "./collection-card";
import { CreateCollectionModal } from "./create-collection-modal";
import { CollectionDetail } from "./collection-detail";
import type { Experience } from "@/app/page";

interface CollectionsTabProps {
  allExperiences: Experience[];
  myCollections: Collection[];
  savedCollections: SavedCollection[];
  loading: boolean;
  onMyCollectionsChange: (cols: Collection[]) => void;
  onSavedCollectionsChange: (cols: SavedCollection[]) => void;
  /** "mine" = only user's collections; "browse" = only saved-from-others; omit = both */
  mode?: "mine" | "browse";
}

export function CollectionsTab({
  allExperiences,
  myCollections,
  savedCollections,
  loading,
  onMyCollectionsChange,
  onSavedCollectionsChange,
  mode,
}: CollectionsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<{ collection: Collection; isOwner: boolean } | null>(null);

  function getExperiencesForCollection(collection: Collection): Experience[] {
    // experience_ids may come back from Xano as a JSON string — parse if needed
    let ids: number[] = [];
    if (Array.isArray(collection.experience_ids)) {
      ids = collection.experience_ids;
    } else if (typeof collection.experience_ids === "string") {
      try { ids = JSON.parse(collection.experience_ids); } catch { ids = []; }
    }
    const idSet = new Set(ids);
    return allExperiences.filter((e) => idSet.has(e.id));
  }

  async function handleCreate(data: { name: string; description: string; is_public: boolean }) {
    const newCol = await createCollection(data);
    onMyCollectionsChange([newCol, ...myCollections]);
  }

  function handleCollectionUpdated(updated: Collection) {
    onMyCollectionsChange(myCollections.map((c) => (c.id === updated.id ? updated : c)));
    setSelected((s) => s ? { ...s, collection: updated } : null);
  }

  function handleCollectionDeleted() {
    if (selected) {
      onMyCollectionsChange(myCollections.filter((c) => c.id !== selected.collection.id));
    }
    setSelected(null);
  }

  if (selected) {
    return (
      <CollectionDetail
        collection={selected.collection}
        experiences={getExperiencesForCollection(selected.collection)}
        isOwner={selected.isOwner}
        onBack={() => setSelected(null)}
        onDeleted={handleCollectionDeleted}
        onUpdated={handleCollectionUpdated}
      />
    );
  }

  const showMine = !mode || mode === "mine";
  const showBrowse = !mode || mode === "browse";

  const visibleMine = showMine ? myCollections : [];
  const visibleBrowse = showBrowse ? savedCollections : [];
  const isEmpty = visibleMine.length === 0 && visibleBrowse.length === 0;
  const total = visibleMine.length + visibleBrowse.length;

  return (
    <div className="px-5 pb-28">
      {/* Header row — only show count + create button in mine mode */}
      {showMine && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[#667085] uppercase tracking-wide font-medium">
            {loading ? "Loading…" : `${total} collection${total !== 1 ? "s" : ""}`}
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#FB6983]"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FB6983" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          {mode === "browse" ? (
            <>
              <p className="text-[#101828] font-semibold text-base">No saved collections</p>
              <p className="text-[#667085] text-sm max-w-[240px]">
                Collections you save from others will appear here.
              </p>
            </>
          ) : (
            <>
              <p className="text-[#101828] font-semibold text-base">No collections yet</p>
              <p className="text-[#667085] text-sm max-w-[240px]">
                Create a collection to curate your favourite experiences.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 bg-[#FB6983] text-white font-semibold rounded-2xl px-6 py-2.5 text-sm"
              >
                New Collection
              </button>
            </>
          )}
        </div>
      )}

      {/* My Collections */}
      {visibleMine.length > 0 && (
        <section className="mb-6">
          {!mode && <h2 className="text-xs text-[#98A2B3] uppercase tracking-wide font-medium mb-3">My Collections</h2>}
          <div className="flex flex-col gap-3">
            {visibleMine.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onClick={() => setSelected({ collection: col, isOwner: true })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Saved from Others */}
      {visibleBrowse.length > 0 && (
        <section>
          {!mode && <h2 className="text-xs text-[#98A2B3] uppercase tracking-wide font-medium mb-3">Saved from Others</h2>}
          <div className="flex flex-col gap-3">
            {visibleBrowse.map((sc) => (
              <SavedCollectionCard
                key={sc.id}
                savedCollection={sc}
                onClick={() => setSelected({ collection: sc.collection, isOwner: false })}
              />
            ))}
          </div>
        </section>
      )}

      {showCreate && (
        <CreateCollectionModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
