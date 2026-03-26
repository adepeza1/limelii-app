"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import type { Collection } from "@/lib/collections";
import { listCollections, addExperienceToCollection } from "@/lib/collections";
import { CreateCollectionModal } from "./create-collection-modal";
import { createCollection } from "@/lib/collections";

interface AddToCollectionSheetProps {
  experienceId: number;
  onFlatSave: () => void; // called when user taps plain "Save"
  onClose: () => void;
}

export function AddToCollectionSheet({
  experienceId,
  onFlatSave,
  onClose,
}: AddToCollectionSheetProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    listCollections()
      .then((data) => {
        const cols = data.my_collections ?? [];
        setCollections(cols);
        // Pre-select collections that already contain this experience.
        // experience_ids may come back from Xano as a JSON string — parse if needed.
        const pre = new Set<number>();
        cols.forEach((c) => {
          let ids: number[] = [];
          if (Array.isArray(c.experience_ids)) ids = c.experience_ids;
          else if (typeof c.experience_ids === "string") {
            try { ids = JSON.parse(c.experience_ids); } catch { ids = []; }
          }
          if (ids.includes(experienceId)) pre.add(c.id);
        });
        setSelected(pre);
      })
      .catch(() => {/* ignore — user may not be logged in */})
      .finally(() => setLoading(false));
  }, [experienceId]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  function toggleCollection(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDone() {
    setSaving(true);
    try {
      await Promise.all(
        Array.from(selected).map((colId) => {
          const col = collections.find((c) => c.id === colId);
          return addExperienceToCollection(colId, experienceId, col?.experience_ids);
        })
      );
      onClose();
    } catch {
      // ignore — best effort
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCollection(data: { name: string; description: string; is_public: boolean }) {
    const newCol = await createCollection(data);
    setCollections((prev) => [newCol, ...prev]);
    setSelected((prev) => new Set([...prev, newCol.id]));
    setShowCreate(false);
  }

  return (
    <>
      <div
        ref={overlayRef}
        onClick={(e) => { handleOverlayClick(e); e.stopPropagation(); }}
        className="fixed inset-0 z-[800] bg-black/40 flex items-end justify-center"
      >
        <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] max-h-[90vh] overflow-y-auto">
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-[#D0D5DD] mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[#101828] text-lg font-bold">Save experience</h2>
            <button onClick={onClose} className="p-1">
              <X className="w-5 h-5 text-[#667085]" />
            </button>
          </div>

          {/* Flat save button */}
          <button
            onClick={() => { onFlatSave(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#EAECF0] mb-3"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FFF0F3] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
                  stroke="#FB6983"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="#FB6983"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#101828]">Save</p>
              <p className="text-xs text-[#667085]">Add to your Saved list</p>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-[#EAECF0]" />
            <span className="text-xs text-[#98A2B3]">or add to a collection</span>
            <div className="flex-1 h-px bg-[#EAECF0]" />
          </div>

          {/* Collections list */}
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-3">
            {loading && (
              <p className="text-sm text-[#667085] text-center py-4">Loading…</p>
            )}
            {!loading && collections.length === 0 && (
              <p className="text-sm text-[#667085] text-center py-4">No collections yet</p>
            )}
            {collections.map((col) => {
              const checked = selected.has(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => toggleCollection(col.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                    checked ? "border-[#FB6983] bg-[#FFF0F3]" : "border-[#EAECF0]"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    checked ? "border-[#FB6983] bg-[#FB6983]" : "border-[#D0D5DD]"
                  }`}>
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#101828] truncate flex-1 text-left">{col.name}</span>
                  <span className="text-xs text-[#667085] shrink-0">
                    {(() => {
                      let ids: number[] = [];
                      if (Array.isArray(col.experience_ids)) ids = col.experience_ids;
                      else if (typeof col.experience_ids === "string") {
                        try { ids = JSON.parse(col.experience_ids); } catch { ids = []; }
                      }
                      return ids.length;
                    })()} exp
                  </span>
                </button>
              );
            })}
          </div>

          {/* New collection */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-2 px-4 py-3 text-[#FB6983] text-sm font-medium mb-4"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>

          {/* Done button */}
          {selected.size > 0 && (
            <button
              onClick={handleDone}
              disabled={saving}
              className="w-full bg-[#FB6983] text-white font-semibold rounded-2xl py-3 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : `Add to ${selected.size} collection${selected.size > 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {showCreate && (
          <CreateCollectionModal
            onSave={handleCreateCollection}
            onClose={() => setShowCreate(false)}
          />
        )}
      </div>
    </>
  );
}
