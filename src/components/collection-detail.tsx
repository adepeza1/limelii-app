"use client";

import { useState } from "react";
import { useBackHandler } from "@/hooks/useBackHandler";
import { ChevronLeft, Send, MoreVertical, Compass, ClipboardList, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Collection } from "@/lib/collections";
import { deleteCollection, updateCollection, saveCollection, removeExperienceFromCollection } from "@/lib/collections";
import type { Experience } from "@/app/page";
import { ExperienceCard } from "./experience-card";
import { ExperienceDetail } from "./experience-detail";
import { CreateCollectionModal } from "./create-collection-modal";
import { ShareSheet } from "./collection-share-sheet";

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

  useBackHandler(!!selected, () => setSelected(null));
  const [showMenu, setShowMenu] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [collectionSaved, setCollectionSaved] = useState(isSaved);
  const [localExperiences, setLocalExperiences] = useState<Experience[]>(experiences);
  const [localCollection, setLocalCollection] = useState<Collection>(collection);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeErrorId, setRemoveErrorId] = useState<number | null>(null);
  const [saveColState, setSaveColState] = useState<"idle" | "error">("idle");
  const [showShareSheet, setShowShareSheet] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this collection?")) return;
    await deleteCollection(localCollection.id);
    onDeleted();
  }

  async function handleRemoveExperience(expId: number) {
    if (!confirm("Remove this experience from the collection?")) return;
    setRemovingId(expId);
    try {
      const updated = await removeExperienceFromCollection(
        localCollection.id,
        expId,
        localCollection.experience_ids
      );
      setLocalExperiences((prev) => prev.filter((e) => e.id !== expId));
      setLocalCollection(updated);
      onUpdated(updated);
    } catch {
      setRemoveErrorId(expId);
      setTimeout(() => setRemoveErrorId(null), 1000);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleSaveCollection() {
    setSavingCollection(true);
    try {
      await saveCollection(localCollection.id);
      setCollectionSaved(true);
    } catch {
      setSaveColState("error");
      setTimeout(() => setSaveColState("idle"), 1000);
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
          {localCollection.name}
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowShareSheet(true)}
            className="p-2"
            aria-label="Share"
          >
            <Send className="w-5 h-5 text-[#344054]" />
          </button>
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
        {localCollection.description && (
          <p className="text-[#667085] text-sm mb-2">{localCollection.description}</p>
        )}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            localCollection.is_public ? "bg-[#ECFDF3] text-[#027A48]" : "bg-[#F2F4F7] text-[#667085]"
          }`}>
            {localCollection.is_public ? "Public" : "Private"}
          </span>
          <span className="text-xs text-[#98A2B3]">
            {localExperiences.length} {localExperiences.length === 1 ? "experience" : "experiences"}
          </span>
        </div>

        {/* Save collection CTA for non-owners */}
        {!isOwner && !collectionSaved && (
          <button
            onClick={handleSaveCollection}
            disabled={savingCollection}
            className={`mt-4 w-full text-white font-semibold rounded-2xl py-3 text-sm transition-colors disabled:opacity-50 ${
              saveColState === "error" ? "bg-red-500" : "bg-[#FB6983]"
            }`}
          >
            {savingCollection ? "Saving…" : saveColState === "error" ? "Try again" : "Save Collection"}
          </button>
        )}
        {!isOwner && collectionSaved && (
          <p className="mt-4 text-center text-sm text-[#027A48] font-medium">
            Saved to your Collections
          </p>
        )}
      </div>

      {/* Experience list */}
      {localExperiences.length === 0 ? (
        <div className="px-5 py-12 flex flex-col items-center gap-4 text-center">
          <p className="text-[#101828] font-semibold text-base">No experiences yet</p>
          <p className="text-[#667085] text-sm max-w-[260px]">
            Find something you love and tap the heart to add it to this collection.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[260px] mt-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#EAECF0] text-left"
            >
              <Compass className="w-5 h-5 text-[#FB6983] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#101828]">Discover</p>
                <p className="text-xs text-[#667085]">Browse curated experiences</p>
              </div>
            </Link>
            <Link
              href="/plan"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#EAECF0] text-left"
            >
              <ClipboardList className="w-5 h-5 text-[#FB6983] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#101828]">Plan</p>
                <p className="text-xs text-[#667085]">Filter by vibe, budget & more</p>
              </div>
            </Link>
            <Link
              href="/create"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#EAECF0] text-left"
            >
              <Sparkles className="w-5 h-5 text-[#FB6983] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#101828]">Create</p>
                <p className="text-xs text-[#667085]">Build an AI itinerary</p>
              </div>
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-4 flex gap-1 items-start pb-28">
          {[
            localExperiences.filter((_, i) => i % 2 === 0),
            localExperiences.filter((_, i) => i % 2 === 1),
          ].map((col, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-1">
              {col.map((exp, rowIdx) => {
                const isTall = colIdx === 0 ? rowIdx % 2 === 0 : rowIdx % 2 === 1;
                return (
                  <div key={exp.id} className="relative">
                    <ExperienceCard
                      experience={exp}
                      compact
                      className={`!aspect-auto !rounded-xl ${isTall ? "h-[220px]" : "h-[188px]"}`}
                      onClick={() => setSelected(exp)}
                    />
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveExperience(exp.id)}
                        disabled={removingId === exp.id}
                        aria-label="Remove from collection"
                        className={`absolute top-3 left-3 z-[3] w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-sm transition-colors disabled:opacity-50 ${
                          removeErrorId === exp.id ? "bg-red-500/80" : "bg-black/30"
                        }`}
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {showEdit && (
        <CreateCollectionModal
          existing={localCollection}
          onSave={async (data) => {
            const updated = await updateCollection(localCollection.id, data);
            setLocalCollection(updated);
            onUpdated(updated);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showShareSheet && (
        <ShareSheet
          title="Share collection"
          subtitle={localCollection.name}
          shareUrl={typeof window !== "undefined"
            ? localCollection.share_token
              ? `${window.location.origin}/c/${localCollection.share_token}`
              : `${window.location.origin}/c/${localCollection.id}`
            : undefined}
          shareTitle={localCollection.name}
          onClose={() => setShowShareSheet(false)}
          onSend={async (userIds) => {
            await Promise.all(
              userIds.map((userId) =>
                fetch(`/api/collections/${localCollection.id}/share-to-user`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ recipient_user_id: userId }),
                })
              )
            );
          }}
        />
      )}
    </div>
  );
}
