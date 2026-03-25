"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Collection } from "@/lib/collections";

interface CreateCollectionModalProps {
  existing?: Collection; // pass to edit an existing collection
  onSave: (data: { name: string; description: string; is_public: boolean }) => Promise<void>;
  onClose: () => void;
}

export function CreateCollectionModal({ existing, onSave, onClose }: CreateCollectionModalProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [isPublic, setIsPublic] = useState(existing?.is_public ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), description: description.trim(), is_public: isPublic });
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-8 safe-bottom">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-[#D0D5DD] mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#101828] text-lg font-bold">
            {existing ? "Edit Collection" : "New Collection"}
          </h2>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-[#667085]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#344054]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brooklyn Date Nights"
              maxLength={60}
              className="w-full border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#FB6983]/40 focus:border-[#FB6983]"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#344054]">
              Description <span className="text-[#98A2B3] font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection about?"
              maxLength={200}
              rows={3}
              className="w-full border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#FB6983]/40 focus:border-[#FB6983] resize-none"
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-[#344054]">Make public</p>
              <p className="text-xs text-[#667085] mt-0.5">Anyone with the link can view & save this collection</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-[#FB6983]" : "bg-[#D0D5DD]"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isPublic ? "translate-x-5" : ""}`}
              />
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#FB6983] text-white font-semibold rounded-2xl py-3 text-sm disabled:opacity-50 mt-1"
          >
            {saving ? "Saving…" : existing ? "Save Changes" : "Create Collection"}
          </button>
        </form>
      </div>
    </div>
  );
}
