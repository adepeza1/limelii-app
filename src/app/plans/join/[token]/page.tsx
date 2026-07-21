"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar } from "lucide-react";
import type { InvitePreview } from "@/lib/plans";
import { getInvitePreview, joinPlan, formatPlanDate } from "@/lib/plans";
import { track } from "@/lib/mixpanel";

export default function JoinPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getInvitePreview(token)
      .then(setPreview)
      .catch(() => setError("This invite link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleJoin() {
    if (!preview) return;
    setJoining(true);
    try {
      const res = await joinPlan(preview.id, token);
      track("plan_joined", { plan_id: preview.id, already_member: res.already_member });
      router.replace(`/plans/${res.plan_id}`);
    } catch {
      // Most likely not logged in — send to login and return here afterward.
      router.push(`/login?redirect_to=${encodeURIComponent(`/plans/join/${token}`)}`);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FB6983] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-[#101828] font-semibold text-base">Invite not found</p>
        <p className="text-[#667085] text-sm max-w-[260px]">{error}</p>
        <button onClick={() => router.push("/")} className="text-[#FB6983] text-sm font-semibold">
          Go to Discover
        </button>
      </div>
    );
  }

  const dateLabel = formatPlanDate(preview.plan_date);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#FFF0F3] flex items-center justify-center mb-5">
        <Users size={30} className="text-[#FB6983]" />
      </div>
      {preview.owner_username && (
        <p className="text-sm text-[#667085] mb-1">@{preview.owner_username} invited you to</p>
      )}
      <h1 className="text-2xl font-bold text-[#101828]">{preview.title}</h1>

      <div className="flex items-center gap-4 text-sm text-[#667085] mt-3">
        {dateLabel && (
          <span className="flex items-center gap-1.5">
            <Calendar size={15} className="text-[#98A2B3]" />
            {dateLabel}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users size={15} className="text-[#98A2B3]" />
          {preview.member_count} going
        </span>
      </div>

      <button
        onClick={handleJoin}
        disabled={joining}
        className="mt-8 w-full max-w-xs bg-[#FB6983] text-white font-semibold rounded-2xl py-3 text-sm disabled:opacity-50"
      >
        {joining ? "Joining…" : "Join the plan"}
      </button>
      <button
        onClick={() => router.push("/")}
        className="mt-3 text-sm font-medium text-[#667085]"
      >
        Not now
      </button>
    </div>
  );
}
