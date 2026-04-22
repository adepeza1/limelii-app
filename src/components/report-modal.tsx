"use client";

import { useState } from "react";
import { X } from "lucide-react";

const REASONS = [
  "Spam",
  "Inappropriate content",
  "Harassment",
  "False information",
  "Other",
];

interface Props {
  type: "experience" | "collection" | "user";
  targetId: number;
  targetName?: string;
  onClose: () => void;
}

export function ReportModal({ type, targetId, targetName, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setLoading(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, target_id: targetId, reason, note }),
      });
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full bg-white rounded-t-2xl px-5 pt-5 pb-10 safe-bottom">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {submitted ? "Thanks for your report" : `Report ${type === "user" ? "user" : type}`}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              We&apos;ve received your report{targetName ? ` for "${targetName}"` : ""}. Our team will review it and take action if necessary.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-3 rounded-xl bg-[#101828] text-white text-sm font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Why are you reporting this {type === "user" ? "user" : type}?
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    reason === r
                      ? "border-[#101828] bg-gray-50 font-medium text-[#101828]"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 resize-none mb-4 focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={handleSubmit}
              disabled={!reason || loading}
              className="w-full py-3 rounded-xl bg-[#101828] text-white text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              {loading ? "Submitting…" : "Submit report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
