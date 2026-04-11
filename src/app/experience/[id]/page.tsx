"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Experience, DiscoveryResponse } from "@/app/page";
import { API_BASE } from "@/lib/xano";
import { ExperienceDetail } from "@/components/experience-detail";

export default function ExperienceDeepLinkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const numId = Number(id);

    // Try single-experience endpoint first (requires Xano GET /experiences/{id})
    fetch(`/api/experiences/${id}`)
      .then(async (r) => {
        if (r.ok) return r.json();
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        // Endpoint not yet created — fall back to discovery feed
        return null;
      })
      .then(async (exp) => {
        if (exp) { setExperience(exp); return; }
        if (notFound) return;

        // Fallback: scan discovery feed for the experience ID
        const discovery = await fetch(`${API_BASE}/discovery`)
          .then((r) => r.json())
          .catch(() => ({ experiences: {} })) as DiscoveryResponse;

        const all = Object.values(discovery.experiences ?? {}).flat();
        const found = all.find((e) => e.id === numId);
        if (found) {
          setExperience(found);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
          <button
            onClick={() => router.push("/")}
            className="mt-2 text-sm font-medium text-[#FB6983]"
          >
            Browse experiences
          </button>
        </div>
      </div>
    );
  }

  return (
    <ExperienceDetail
      experience={experience}
      onBack={() => router.back()}
      backLabel="Back"
    />
  );
}
