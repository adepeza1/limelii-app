"use client";

import { useState } from "react";
import { ChevronLeft, Share2, MoreVertical } from "lucide-react";
import type { Collection } from "@/lib/collections";
import { deleteCollection, updateCollection, saveCollection } from "@/lib/collections";
import type { Experience } from "@/app/page";
import { ExperienceCard } from "./experience-card";
import { ExperienceDetail } from "./experience-detail";
import { CreateCollectionModal } from "./create-collection-modal";

interface CollectionDetailProps {
  collection: Collection;
  experiences: Experience[]; // pre-fetched by parent from discovery data
  isOwner: boolean;
  isSaved?: boolean; // true if this is a saved-from-others collection being viewed
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: (updated: Collection) => void;
}

export function CollectionDetail({
  collection,
  experiences,
  isOwner,
  isSaved = false,
  onBack,
  onDeleted,
  onUpdated,
}: CollectionDetailProps) {
  const [selected, setSelected] = useState<Experience | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [collectionSaved, setCollectionSaved] = useState(isSaved);

  async function handleDelete() {
    if (!confirm("Delete this collection?")) return;
    await deleteCollection(collection.id);
    onDeleted();
  }

  async function handleShare() {
    const url = `${window.location.origin}/collections/${collection.id}`;
    if (navigator.share) {
      await navigator.share({ title: collection.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  async function handleSaveCollection() {
    setSavingCollection(true);
    try {
      await saveCollection(collection.id);
      setCollectionSaved(true);
    } catch {
      // ignore
    } finally {
      setSavingCollection(false);
    }
  }

  if (selected) {
    return (
      <ExperienceDetail
        experience={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      {/* Header */}
      <div className="h-[44px]" />
      <header className="flex items-center gap-3 px-4 py-3 h-12">
        <button onClick={onBack} aria-label="Back">
          <ChevronLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium text-black truncate">
          {collection.name}
        </h1>
        <div className="flex items-center gap-1">
          {collection.is_public && (
            <button
              onClick={handleShare}
              className="p-2"
              aria-label="Share collection"
            >
              <Share2 className="w-5 h-5 text-[#344054]" />
            </button>
          )}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-2"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5 text-[#344054]" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-lg border border-[#EAECF0] overflow-hidden z-10 w-44">
                  <button
                    onClick={() => { setShowMenu(false); setShowEdit(true); }}
                    className="w-full text-left px-4 py-3 text-sm text-[#101828] hover:bg-[#F9FAFB]"
                  >
                    Edit collection
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-[#FFF0F3]"
                  >
                    Delete collection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Meta */}
      <div className="px-5 pb-4">
        {collection.description && (
          <p className="text-[#667085] text-sm mb-2">{collection.description}</p>
        )}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            collection.is_public ? "bg-[#ECFDF3] text-[#027A48]" : "bg-[#F2F4F7] text-[#667085]"
          }`}>
            {collection.is_public ? "Public" : "Private"}
          </span>
          <span className="text-xs text-[#98A2B3]">
            {experiences.length} {experiences.length === 1 ? "experience" : "experiences"}
          </span>
        </div>

        {/* Save collection CTA for non-owners */}
        {!isOwner && !collectionSaved && (
          <button
            onClick={handleSaveCollection}
            disabled={savingCollection}
            className="mt-4 w-full bg-[#FB6983] text-white font-semibold rounded-2xl py-3 text-sm disabled:opacity-50"
          >
            {savingCollection ? "Saving…" : "Save Collection"}
          </button>
        )}
        {!isOwner && collectionSaved && (
          <p className="mt-4 text-center text-sm text-[#027A48] font-medium">
            Saved to your Collections
          </p>
        )}
      </div>

      {/* Experience list */}
      {experiences.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="text-[#101828] font-semibold text-base">No experiences yet</p>
          <p className="text-[#667085] text-sm mt-1">Save experiences to this collection from the Discover tab.</p>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-4 pb-28">
          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onClick={() => setSelected(exp)}
            />
          ))}
        </div>
      )}

      {showEdit && (
        <CreateCollectionModal
          existing={collection}
          onSave={async (data) => {
            const updated = await updateCollection(collection.id, data);
            onUpdated(updated);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
