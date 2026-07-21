"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Users, Calendar, Check } from "lucide-react";
import Link from "next/link";
import type { Plan } from "@/lib/plans";
import { listPlans, createPlan, formatPlanDate } from "@/lib/plans";
import { CreatePlanModal } from "@/components/create-plan-modal";
import { track } from "@/lib/mixpanel";

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthed, setUnauthed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => {
        if (r.status === 401) { setUnauthed(true); return []; }
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: { title: string; plan_date: string | null }) {
    const plan = await createPlan(data);
    track("plan_created", { plan_id: plan.id, has_date: !!data.plan_date });
    router.push(`/plans/${plan.id}`);
  }

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="sticky top-0 z-10 bg-white h-[env(safe-area-inset-top,44px)]" />

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 h-12">
        <Link href="/saved" aria-label="Back">
          <ChevronLeft className="w-6 h-6 text-black" />
        </Link>
        <h1 className="flex-1 text-lg font-medium text-black">Plans</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#FB6983]"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </header>

      {loading ? (
        <div className="px-5 pt-2 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : unauthed ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] flex items-center justify-center">
            <Users size={26} className="text-[#FB6983]" />
          </div>
          <p className="text-[#101828] font-semibold text-base">Log in to plan together</p>
          <p className="text-[#667085] text-sm max-w-[240px]">
            Create shared plans, invite friends, and vote on where to go.
          </p>
          <button
            onClick={() => router.push("/login?redirect_to=/plans")}
            className="mt-1 bg-[#FB6983] text-white font-semibold rounded-2xl px-6 py-2.5 text-sm"
          >
            Log In
          </button>
        </div>
      ) : plans.length === 0 ? (
        <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] flex items-center justify-center">
            <Users size={26} className="text-[#FB6983]" />
          </div>
          <p className="text-[#101828] font-semibold text-base">No plans yet</p>
          <p className="text-[#667085] text-sm max-w-[260px]">
            Start a plan for your next night out, invite friends, and let the
            group vote on where to go.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 bg-[#FB6983] text-white font-semibold rounded-2xl px-6 py-2.5 text-sm"
          >
            Start a plan
          </button>
        </div>
      ) : (
        <div className="px-5 pt-2 pb-28 flex flex-col gap-3">
          {plans.map((plan) => {
            const dateLabel = formatPlanDate(plan.plan_date);
            const locked = plan.status === "locked";
            return (
              <button
                key={plan.id}
                onClick={() => router.push(`/plans/${plan.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-[#EAECF0] p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-[#101828] text-[15px] leading-snug">
                    {plan.title}
                  </p>
                  {locked && (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#027A48] bg-[#ECFDF3] rounded-full px-2 py-0.5">
                      <Check size={11} />
                      Locked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#667085]">
                  {dateLabel && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-[#98A2B3]" />
                      {dateLabel}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="text-[#98A2B3]" />
                    {plan.member_count ?? 1} going
                  </span>
                  {typeof plan.candidate_count === "number" && (
                    <span className="text-[#98A2B3]">
                      {plan.candidate_count} {plan.candidate_count === 1 ? "idea" : "ideas"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreatePlanModal onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
