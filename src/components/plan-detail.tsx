"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, UserPlus, Calendar, ThumbsUp, Trash2, Plus, X,
  Search, Check, MapPin, Lock,
} from "lucide-react";
import type { Experience, DiscoveryResponse, Place } from "@/app/page";
import type { PlanDetail, PlanCandidate, PlanMember } from "@/lib/plans";
import {
  getPlan, addCandidate, removeCandidate, toggleVote, updatePlan,
  formatPlanDate, extractPhotoUrl,
} from "@/lib/plans";
import { API_BASE } from "@/lib/xano";
import { useToast } from "@/components/toast";
import { track } from "@/lib/mixpanel";

// First usable image for an experience (from its places) or a place.
function experienceImage(exp?: Experience | null): string | null {
  if (!exp) return null;
  for (const p of exp.places_id ?? []) {
    const url = p.display_images?.[0]?.url ?? p.images?.[0]?.url;
    if (url) return url;
  }
  return null;
}
function placeImage(place?: Place | null): string | null {
  if (!place) return null;
  return place.display_images?.[0]?.url ?? place.images?.[0]?.url ?? null;
}

function MemberAvatar({ member }: { member: PlanMember }) {
  const url = extractPhotoUrl(member);
  const initials = (member.username ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[11px] font-bold text-[#667085] overflow-hidden ring-2 ring-white">
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={member.username ?? ""} className="w-full h-full object-cover" />
        : initials}
    </div>
  );
}

export function PlanDetailView({ planId }: { planId: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busyVote, setBusyVote] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const reload = () =>
    getPlan(planId).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    getPlan(planId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [planId]);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (u?.id) setCurrentUserId(u.id); })
      .catch(() => {});
  }, []);

  const candidatesSorted = useMemo(() => {
    if (!data) return [];
    return [...data.candidates].sort((a, b) => b.vote_count - a.vote_count);
  }, [data]);

  async function handleVote(c: PlanCandidate) {
    if (busyVote) return;
    setBusyVote(c.id);
    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        candidates: prev.candidates.map((x) =>
          x.id === c.id
            ? { ...x, voted_by_me: !x.voted_by_me, vote_count: x.vote_count + (x.voted_by_me ? -1 : 1) }
            : x
        ),
      };
    });
    try {
      const res = await toggleVote(planId, c.id);
      track("plan_vote", { plan_id: planId, candidate_id: c.id, voted: res.voted });
      setData((prev) => prev ? {
        ...prev,
        candidates: prev.candidates.map((x) =>
          x.id === c.id ? { ...x, voted_by_me: res.voted, vote_count: res.vote_count } : x
        ),
      } : prev);
    } catch {
      toast("Couldn't record your vote", "error");
      reload();
    } finally {
      setBusyVote(null);
    }
  }

  async function handleRemove(c: PlanCandidate) {
    try {
      await removeCandidate(planId, c.id);
      setData((prev) => prev ? { ...prev, candidates: prev.candidates.filter((x) => x.id !== c.id) } : prev);
    } catch {
      toast("Couldn't remove that", "error");
    }
  }

  async function handleInvite() {
    const token = data?.plan.share_token;
    if (!token) return;
    const url = `${window.location.origin}/plans/join/${token}`;
    track("plan_invite_opened", { plan_id: planId });
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: data?.plan.title ?? "Join my plan", url }); } catch { /* dismissed */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast("Invite link copied!", "success"); }
      catch { toast("Couldn't copy link", "error"); }
    }
  }

  async function handleLock() {
    if (!data) return;
    const top = candidatesSorted[0];
    try {
      const updated = await updatePlan(planId, {
        status: "locked",
        locked_experience_id: top?.experience_id ?? null,
      });
      track("plan_locked", { plan_id: planId });
      setData({ ...data, plan: { ...data.plan, ...updated, status: "locked" } });
      toast("Plan locked in 🎉", "success");
    } catch {
      toast("Couldn't lock the plan", "error");
    }
  }

  function onAdded(candidate: PlanCandidate) {
    setData((prev) => prev ? { ...prev, candidates: [...prev.candidates, candidate] } : prev);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FB6983] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-[#101828] font-semibold text-base">Plan unavailable</p>
        <p className="text-[#667085] text-sm">This plan may have been deleted, or you&apos;re not a member.</p>
        <button onClick={() => router.push("/plans")} className="text-[#FB6983] text-sm font-semibold">
          Back to Plans
        </button>
      </div>
    );
  }

  const { plan, members, is_owner } = data;
  const dateLabel = formatPlanDate(plan.plan_date);
  const locked = plan.status === "locked";

  return (
    <div className="bg-white min-h-screen max-w-5xl mx-auto">
      <div className="sticky top-0 z-10 bg-white h-[env(safe-area-inset-top,44px)]" />

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 h-12">
        <button onClick={() => router.push("/plans")} aria-label="Back">
          <ChevronLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium text-black truncate">{plan.title}</h1>
        <button onClick={handleInvite} aria-label="Invite" className="p-2">
          <UserPlus className="w-5 h-5 text-[#344054]" />
        </button>
      </header>

      {/* Meta */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-4 text-sm text-[#667085] mb-3">
          {dateLabel ? (
            <span className="flex items-center gap-1.5">
              <Calendar size={15} className="text-[#98A2B3]" />
              {dateLabel}
            </span>
          ) : (
            <span className="text-[#98A2B3]">No date set</span>
          )}
          {locked && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-[#027A48] bg-[#ECFDF3] rounded-full px-2 py-0.5">
              <Lock size={11} />
              Locked in
            </span>
          )}
        </div>

        {/* Roster */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {members.slice(0, 6).map((m) => <MemberAvatar key={m.id} member={m} />)}
            </div>
            <span className="ml-3 text-xs text-[#667085]">
              {members.length} {members.length === 1 ? "person" : "people"} going
            </span>
          </div>
          <button
            onClick={handleInvite}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#FB6983]"
          >
            <UserPlus size={15} />
            Invite
          </button>
        </div>
      </div>

      {/* Candidates */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-[#98A2B3] uppercase tracking-wide font-medium">
            Ideas · vote for your favorites
          </h2>
          {!locked && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 text-sm font-semibold text-[#FB6983]"
            >
              <Plus size={15} />
              Add
            </button>
          )}
        </div>

        {candidatesSorted.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <p className="text-[#101828] font-semibold text-sm">No ideas yet</p>
            <p className="text-[#667085] text-sm max-w-[240px]">
              Add a few spots and let the group vote them up.
            </p>
            {!locked && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-1 bg-[#FB6983] text-white font-semibold rounded-2xl px-6 py-2.5 text-sm"
              >
                Add an idea
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {candidatesSorted.map((c, i) => {
              const title = c.experience?.title ?? c.place?.name ?? "Suggestion";
              const img = experienceImage(c.experience) ?? placeImage(c.place);
              const subtitle = c.experience
                ? (c.experience.neighborhoods?.[0] ?? c.experience.places_id?.[0]?.neighborhood ?? "")
                : (c.place?.neighborhood ?? "");
              const isTop = i === 0 && c.vote_count > 0;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-2xl border p-2.5 ${
                    isTop ? "border-[#FB6983]/40 bg-[#FFF7F8]" : "border-[#EAECF0] bg-white"
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl bg-[#F2F4F7] overflow-hidden shrink-0 flex items-center justify-center">
                    {img
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={img} alt={title} className="w-full h-full object-cover" />
                      : <MapPin size={20} className="text-[#D0D5DD]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#101828] text-sm leading-tight truncate">{title}</p>
                    {subtitle && <p className="text-xs text-[#667085] mt-0.5 truncate">{subtitle}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {c.added_by_username && (
                        <p className="text-[11px] text-[#98A2B3]">by @{c.added_by_username}</p>
                      )}
                      {isTop && (
                        <span className="text-[10px] font-semibold text-[#FB6983] uppercase tracking-wide">Leading</span>
                      )}
                    </div>
                  </div>
                  {/* Delete (adder or plan owner) */}
                  {!locked && (is_owner || c.added_by_user_id === currentUserId) && (
                    <button
                      onClick={() => handleRemove(c)}
                      aria-label="Remove"
                      className="p-2 text-[#D0D5DD] hover:text-[#F04438]"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {/* Vote */}
                  <button
                    onClick={() => handleVote(c)}
                    disabled={locked || busyVote === c.id}
                    aria-pressed={c.voted_by_me}
                    className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl shrink-0 transition-colors ${
                      c.voted_by_me ? "bg-[#FB6983] text-white" : "bg-[#F2F4F7] text-[#667085]"
                    } disabled:opacity-60`}
                  >
                    <ThumbsUp size={15} fill={c.voted_by_me ? "currentColor" : "none"} />
                    <span className="text-xs font-bold">{c.vote_count}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Owner lock CTA */}
      {is_owner && !locked && candidatesSorted.length > 0 && (
        <div className="px-5 pb-28 pt-2">
          <button
            onClick={handleLock}
            className="w-full bg-[#101828] text-white font-semibold rounded-2xl py-3 text-sm flex items-center justify-center gap-2"
          >
            <Lock size={15} />
            Lock in the top pick
          </button>
          <p className="text-center text-xs text-[#98A2B3] mt-2">
            Locks the plan for everyone. Voting closes.
          </p>
        </div>
      )}
      {(!is_owner || locked || candidatesSorted.length === 0) && <div className="h-28" />}

      {showAdd && (
        <AddIdeasSheet
          planId={planId}
          existingExperienceIds={data.candidates.map((c) => c.experience_id).filter(Boolean) as number[]}
          onClose={() => setShowAdd(false)}
          onAdded={onAdded}
        />
      )}
    </div>
  );
}

// ─── Add ideas bottom sheet ──────────────────────────────────────────────────
// Pull the public discovery pool and let the user tap experiences to suggest.

function AddIdeasSheet({
  planId, existingExperienceIds, onClose, onAdded,
}: {
  planId: number;
  existingExperienceIds: number[];
  onClose: () => void;
  onAdded: (c: PlanCandidate) => void;
}) {
  const { toast } = useToast();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set(existingExperienceIds));

  useEffect(() => {
    fetch(`${API_BASE}/discovery`)
      .then((r) => r.json())
      .then((d: DiscoveryResponse) => setExperiences(Object.values(d.experiences ?? {}).flat()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return experiences.slice(0, 40);
    return experiences.filter((e) =>
      e.title?.toLowerCase().includes(q) ||
      e.neighborhoods?.some((n) => n.toLowerCase().includes(q)) ||
      e.places_id?.some((p) => p.name?.toLowerCase().includes(q) || p.neighborhood?.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [experiences, query]);

  async function handleAdd(exp: Experience) {
    if (adding || added.has(exp.id)) return;
    setAdding(exp.id);
    try {
      const candidate = await addCandidate(planId, { experience_id: exp.id });
      track("plan_candidate_added", { plan_id: planId, experience_id: exp.id });
      // The API returns the candidate with its joined experience; if it didn't,
      // fall back to the experience we already have so the card renders.
      onAdded(candidate.experience ? candidate : { ...candidate, experience: exp });
      setAdded((prev) => new Set(prev).add(exp.id));
    } catch {
      toast("Couldn't add that", "error");
    } finally {
      setAdding(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[900] bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[901] bg-white rounded-t-3xl max-h-[85vh] flex flex-col max-w-5xl mx-auto">
        <div className="w-10 h-1 rounded-full bg-[#D0D5DD] mx-auto mt-3 mb-4 shrink-0" />

        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <p className="text-[#101828] font-semibold text-base">Add ideas</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F4F7]">
            <X size={16} className="text-[#667085]" />
          </button>
        </div>

        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-2xl px-3 py-2.5">
            <Search size={14} className="text-[#98A2B3] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search experiences, places, neighborhoods…"
              className="flex-1 text-sm text-[#101828] placeholder:text-[#98A2B3] bg-transparent outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          {loading ? (
            <p className="text-sm text-[#667085] text-center py-10">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[#667085] text-center py-10">No matches</p>
          ) : (
            <div className="flex flex-col">
              {filtered.map((exp) => {
                const img = experienceImage(exp);
                const isAdded = added.has(exp.id);
                const sub = exp.neighborhoods?.[0] ?? exp.places_id?.[0]?.neighborhood ?? "";
                return (
                  <button
                    key={exp.id}
                    onClick={() => handleAdd(exp)}
                    disabled={isAdded || adding === exp.id}
                    className="flex items-center gap-3 py-2.5 w-full text-left disabled:opacity-100"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#F2F4F7] overflow-hidden shrink-0 flex items-center justify-center">
                      {img
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={img} alt={exp.title} className="w-full h-full object-cover" />
                        : <MapPin size={18} className="text-[#D0D5DD]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#101828] leading-tight truncate">{exp.title}</p>
                      {sub && <p className="text-xs text-[#667085] truncate">{sub}</p>}
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isAdded ? "bg-[#12B76A]" : "bg-[#F2F4F7]"
                    }`}>
                      {isAdded ? <Check size={14} className="text-white" /> : <Plus size={15} className="text-[#667085]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
