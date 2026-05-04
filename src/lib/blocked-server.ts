import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

/**
 * Server-side helper: returns the set of user IDs the current user has
 * blocked. Returns an empty set if the user isn't authed or the lookup
 * fails — so callers can safely chain a `.has()` filter without extra
 * null-checks.
 */
export async function getMyBlockedIdSet(): Promise<Set<number>> {
  try {
    const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
    if (!meRes.ok) return new Set();
    const me = await meRes.json();
    const currentUserId: number = me.id;

    const blocksRes = await apiFetch("/user_blocks");
    if (!blocksRes.ok) return new Set();
    const all = await blocksRes.json();
    if (!Array.isArray(all)) return new Set();

    const ids = new Set<number>();
    for (const row of all) {
      if (row?.blocker_id === currentUserId && typeof row?.blocked_id === "number") {
        ids.add(row.blocked_id);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}
