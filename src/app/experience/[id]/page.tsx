"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Experience, DiscoveryResponse } from "@/app/page";
import { API_BASE } from "@/lib/xano";
import { ExperienceDetail } from "@/components/experience-detail";
import { saveExperience } from "@/lib/saved";

export default function ExperienceDeepLinkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null | undefined>(undefined);
  const [autoSave, setAutoSave] = useState(false);
  const [savedState, setSavedState] = useState<"idle" | "saving" | "saved">("idle");

  // Detect ?autosave=1 from login redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autosave") === "1") {
      setAutoSave(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Load current user
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => setCurrentUserId(u?.id ?? null))
      .catch(() => setCurrentUserId(null));
  }, []);

  // Load experience
  useEffect(() => {
    const numId = Number(id);

    fetch(`/api/experiences/${id}`)
      .then(async (r) => {
        if (r.ok) return r.json();
        if (r.status === 404) { setNotFound(true); return null; }
        return null; // endpoint not yet created — fall back
      })
      .then(async (exp) => {
        if (exp) { setExperience(exp); return; }
        if (notFound) return;

        // Fallback: scan discovery feed
        const discovery = await fetch(`${API_BASE}/discovery`)
          .then((r) => r.json())
          .catch(() => ({ experiences: {} })) as DiscoveryResponse;

        const found = Object.values(discovery.experiences ?? {}).flat().find((e) => e.id === numId);
        if (found) setExperience(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-save experience after login redirect
  useEffect(() => {
    if (!autoSave || !experience || currentUserId == null || currentUserId === undefined) return;
    if (savedState !== "idle") return;
    setSavedState("saving");
    saveExperience(experience.id)
      .then(() => setSavedState("saved"))
      .catch(() => setSavedState("idle"));
  }, [autoSave, experience, currentUserId, savedState]);

  const loginUrl = `/login?redirect_to=${encodeURIComponent(`/experience/${id}?autosave=1`)}`;
  const isLoggedOut = currentUserId === null;

  if (loading) {
    return (
      <div className="bg-white min-h-screen max-w-5xl mx-auto flex items-center justify-center">
        <p className="text-sm text-[#667085]">Loading…</p>
      </div>
    );
  }

  if (notFound || !experience) {
    return (
      <div className="bg-white min-h-screen max-w-5xl mx-auto">
        <div className="h-[env(safe-area-inset-top,44px)]" />
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[#EAECF0]">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft size={22} className="text-[#101828]" />
          </button>
        </div>
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-[#101828] font-semibold text-base">Experience not found</p>
          <p className="text-[#667085] text-sm">This link may be outdated.</p>
          <button onClick={() => router.push("/")} className="mt-2 text-sm font-medium text-[#FB6983]">
            Browse experiences
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ExperienceDetail
        experience={experience}
        onBack={() => router.back()}
        backLabel="Back"
      />

      {/* Persistent sign-up CTA — unauthenticated only */}
      {isLoggedOut && (
        <div className="fixed bottom-0 left-0 right-0 z-[800] max-w-5xl mx-auto bg-white border-t border-[#EAECF0] px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          <p className="text-sm font-semibold text-[#101828] mb-0.5">Save this experience to limelii</p>
          <p className="text-xs text-[#667085] mb-3">Sign up free to save and discover experiences in NYC.</p>
          <button
            onClick={() => router.push(loginUrl)}
            className="w-full py-3 rounded-2xl bg-[#FB6983] text-white font-semibold text-sm"
          >
            Sign up / Log in
          </button>
        </div>
      )}

      {/* Auto-save confirmation toast */}
      {savedState === "saved" && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[900] bg-[#101828] text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
          Saved to your experiences
        </div>
      )}
    </>
  );
}
