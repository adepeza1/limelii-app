// ─── Plan Together: types + client helpers ──────────────────────────────────
// These call the Next.js BFF routes under /api/plans, which proxy to Xano.
// See plan-together-guide.md for the backend contract.

import type { Experience, Place } from "@/app/page";

export type PlanStatus = "planning" | "locked";

export interface PlanMember {
  id: number;
  user_id: number;
  role: "owner" | "member";
  username?: string;
  name?: string;
  // Xano may return the photo as a URL string or a { url } object
  photo?: string | { url: string };
  profile_photo_url?: string | { url: string };
  picture?: string | { url: string };
}

export interface PlanCandidate {
  id: number;
  plan_id: number;
  added_by_user_id: number;
  added_by_username?: string;
  experience_id?: number | null;
  place_id?: number | null;
  note?: string;
  vote_count: number;
  voted_by_me: boolean;
  // Joined by the API so the card can render immediately
  experience?: Experience | null;
  place?: Place | null;
}

export interface Plan {
  id: number;
  created_at: number;
  title: string;
  plan_date?: string | null; // YYYY-MM-DD
  owner_user_id: number;
  status: PlanStatus;
  locked_experience_id?: number | null;
  share_token?: string;
  // Summary fields the list endpoint adds
  member_count?: number;
  candidate_count?: number;
}

export interface PlanDetail {
  plan: Plan;
  members: PlanMember[];
  candidates: PlanCandidate[];
  is_owner: boolean;
}

export interface InvitePreview {
  id: number;
  title: string;
  plan_date?: string | null;
  member_count: number;
  owner_username?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function listPlans(): Promise<Plan[]> {
  const res = await fetch("/api/plans");
  if (!res.ok) throw new Error("Failed to load plans");
  return res.json();
}

export async function createPlan(data: {
  title: string;
  plan_date?: string | null;
}): Promise<Plan> {
  const res = await fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create plan");
  return res.json();
}

export async function getPlan(id: number): Promise<PlanDetail> {
  const res = await fetch(`/api/plans/${id}`);
  if (!res.ok) throw new Error("Failed to load plan");
  return res.json();
}

export async function updatePlan(
  id: number,
  data: Partial<{
    title: string;
    plan_date: string | null;
    status: PlanStatus;
    locked_experience_id: number | null;
  }>
): Promise<Plan> {
  const res = await fetch(`/api/plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update plan");
  return res.json();
}

export async function deletePlan(id: number): Promise<void> {
  const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete plan");
}

export async function addCandidate(
  planId: number,
  data: { experience_id?: number; place_id?: number; note?: string }
): Promise<PlanCandidate> {
  const res = await fetch(`/api/plans/${planId}/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add suggestion");
  return res.json();
}

export async function removeCandidate(
  planId: number,
  candidateId: number
): Promise<void> {
  const res = await fetch(`/api/plans/${planId}/candidates/${candidateId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove suggestion");
}

export async function toggleVote(
  planId: number,
  candidateId: number
): Promise<{ voted: boolean; vote_count: number }> {
  const res = await fetch(
    `/api/plans/${planId}/candidates/${candidateId}/vote`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to vote");
  return res.json();
}

export async function joinPlan(
  planId: number,
  shareToken: string
): Promise<{ plan_id: number; already_member: boolean }> {
  const res = await fetch(`/api/plans/${planId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ share_token: shareToken }),
  });
  if (!res.ok) throw new Error("Failed to join plan");
  return res.json();
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const res = await fetch(`/api/plans/invite/${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("Invite not found");
  return res.json();
}

// ─── Small shared utilities ──────────────────────────────────────────────────

/** Extract a usable image URL from Xano's varied photo field shapes. */
export function extractPhotoUrl(
  user: Pick<PlanMember, "photo" | "profile_photo_url" | "picture">
): string | null {
  function fromVal(val: unknown): string | null {
    if (!val) return null;
    if (typeof val === "string") return val || null;
    if (typeof val === "object" && val !== null && "url" in val) {
      const u = (val as { url?: unknown }).url;
      return typeof u === "string" ? u || null : null;
    }
    return null;
  }
  return (
    fromVal(user.photo) ??
    fromVal(user.profile_photo_url) ??
    fromVal(user.picture)
  );
}

/** Format a YYYY-MM-DD plan date into a friendly label. Date-only, no TZ math. */
export function formatPlanDate(date?: string | null): string | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
