"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface CreatePlanModalProps {
  onSave: (data: { title: string; plan_date: string | null }) => Promise<void>;
  onClose: () => void;
}

export function CreatePlanModal({ onSave, onClose }: CreatePlanModalProps) {
  const [title, setTitle] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give your plan a name");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ title: title.trim(), plan_date: planDate || null });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[900] bg-black/40 flex items-end justify-center"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-[#D0D5DD] mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[#101828] text-lg font-bold">Plan together</h2>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-[#667085]" />
          </button>
        </div>
        <p className="text-sm text-[#667085] mb-6">
          Start a plan, invite friends, and vote on where to go.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#344054]">What&apos;s the plan?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday night out"
              maxLength={60}
              autoFocus
              className="w-full border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-base text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#FB6983]/40 focus:border-[#FB6983]"
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#344054]">
              When? <span className="text-[#98A2B3] font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="w-full border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-base text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#FB6983]/40 focus:border-[#FB6983]"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#FB6983] text-white font-semibold rounded-2xl py-3 text-sm disabled:opacity-50 mt-1"
          >
            {saving ? "Creating…" : "Create plan"}
          </button>
        </form>
      </div>
    </div>
  );
}
