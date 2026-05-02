"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ClipboardList } from "lucide-react";
import { useToast } from "@/components/toast";
import type { Experience } from "@/app/page";
import { ExperienceCard } from "./experience-card";
import { ExperienceDetail } from "./experience-detail";
import { useBackHandler } from "@/hooks/useBackHandler";

interface ProfileExperiencesProps {
  onCountLoaded?: (count: number) => void;
  creating?: boolean;
  onCreatingDone?: () => void;
}

function CreatingPlaceholder() {
  return (
    <div className="w-full h-[220px] rounded-xl bg-gray-100 flex flex-col items-center justify-center gap-2">
      <div
        className="w-7 h-7 rounded-full border-2 border-gray-300"
        style={{ borderTopColor: "#FF9A56", animation: "spin 0.9s linear infinite" }}
      />
      <p className="text-xs text-gray-400 font-medium">Experience being created…</p>
    </div>
  );
}

function DeleteConfirmModal({
  experience,
  onConfirm,
  onCancel,
  deleting,
}: {
  experience: Experience;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[900]" onClick={onCancel} />
      <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[901] bg-white rounded-2xl p-6 max-w-sm mx-auto shadow-xl">
        <div className="w-12 h-12 rounded-full bg-[#FFF0F3] flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-[#E8405A]" />
        </div>
        <h3 className="text-[#101828] font-semibold text-base text-center mb-1">Delete experience?</h3>
        <p className="text-[#667085] text-sm text-center mb-6">
          &ldquo;{experience.title}&rdquo; will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#EAECF0] text-sm font-semibold text-[#344054]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-[#E8405A] text-sm font-semibold text-white disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </>
  );
}

export function ProfileExperiences({ onCountLoaded, creating, onCreatingDone }: ProfileExperiencesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState(false);
  const prevPendingRef = useRef(false);

  useBackHandler(!!selectedExperience, () => setSelectedExperience(null));

  async function fetchExperiences() {
    try {
      const res = await fetch("/api/user-experiences");
      if (!res.ok) {
        setError("Failed to load your experiences");
        return;
      }
      const data = await res.json();
      const exps: Experience[] = Array.isArray(data.experiences) ? data.experiences : [];
      setExperiences(exps);
      // Count only finished experiences for the displayed counter so the
      // tally doesn't include the in-progress placeholder.
      const doneCount = exps.filter((e) => e.status !== "generating").length;
      onCountLoaded?.(doneCount);
    } catch {
      setError("Failed to load your experiences");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExperiences();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show only experiences that finished generating; the rest are represented
  // by the skeleton placeholder.
  const visibleExperiences = experiences.filter((e) => e.status !== "generating");
  const pendingCount = experiences.filter((e) => e.status === "generating").length;
  // We're "pending" if either the URL arrived with ?creating=true (the user
  // just submitted and the row may not exist yet) or Xano still has at least
  // one experience in the generating state.
  const isPending = (creating ?? false) || pendingCount > 0;

  // Poll while pending; stop the moment everything's done.
  useEffect(() => {
    if (!isPending) return;
    const id = setInterval(fetchExperiences, 3000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  // Notify the parent on the falling edge (pending → not pending) so it can
  // clear the ?creating=true flag and stop showing any wrapper UI.
  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      onCreatingDone?.();
    }
    prevPendingRef.current = isPending;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/user-experiences/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        const updated = experiences.filter((e) => e.id !== deleteTarget.id);
        setExperiences(updated);
        onCountLoaded?.(updated.length);
        setDeleteTarget(null);
      } else {
        toast("Couldn't delete experience", "error");
      }
    } catch {
      toast("Couldn't delete experience", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (selectedExperience) {
    return (
      <ExperienceDetail
        experience={selectedExperience}
        onBack={() => setSelectedExperience(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="px-4 flex gap-1 items-start pb-4">
        {[0, 1].map((col) => (
          <div key={col} className="flex-1 flex flex-col gap-1">
            {[0, 1].map((row) => (
              <div
                key={row}
                className={`w-full rounded-xl bg-gray-100 animate-pulse ${(col === 0 ? row % 2 === 0 : row % 2 === 1) ? "h-[220px]" : "h-[188px]"}`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-gray-500 py-12 px-4">{error}</p>;
  }

  if (!isPending && visibleExperiences.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center px-5">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] flex items-center justify-center">
          <ClipboardList size={28} stroke="#FB6983" strokeWidth={1.8} />
        </div>
        <p className="text-[#101828] font-semibold text-base">Nothing created yet</p>
        <p className="text-[#667085] text-sm max-w-[240px]">
          Use AI to build your first experience in seconds.
        </p>
        <button
          onClick={() => router.push("/create")}
          className="mt-1 bg-[#FB6983] text-white font-semibold rounded-2xl px-6 py-2.5 text-sm"
        >
          Create an Experience
        </button>
      </div>
    );
  }

  const leftCol = visibleExperiences.filter((_, i) => i % 2 === 0);
  const rightCol = visibleExperiences.filter((_, i) => i % 2 === 1);

  return (
    <>
      <div className="px-4 pb-4 flex gap-1 items-start">
        {[leftCol, rightCol].map((col, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col gap-1">
            {colIdx === 0 && isPending && <CreatingPlaceholder />}
            {col.map((exp, rowIdx) => {
              const isTall = colIdx === 0 ? rowIdx % 2 === 0 : rowIdx % 2 === 1;
              return (
                <div key={exp.id} className="relative group">
                  <ExperienceCard
                    experience={exp}
                    compact
                    className={`!aspect-auto !rounded-xl ${isTall ? "h-[220px]" : "h-[188px]"}`}
                    onClick={() => setSelectedExperience(exp)}
                  />
                  {/* Delete button overlay */}
                  <div className="absolute top-3 left-3 z-[3]">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(exp); }}
                      className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
                      title="Delete experience"
                    >
                      <Trash2 size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          experience={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

    </>
  );
}
