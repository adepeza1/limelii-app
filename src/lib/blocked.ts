"use client";

const CACHE_KEY = "limelii_blocked_users_cache";
const IDS_KEY = "limelii_blocked_ids_cache";

export interface BlockedUserCache {
  id: number;
  username?: string;
  name?: string;
  photoUrl?: string | null;
}

type CacheMap = Record<string, BlockedUserCache>;

function readCache(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(map: CacheMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // storage may be full or unavailable; nothing to do
  }
}

export function cacheBlockedUser(user: BlockedUserCache) {
  const map = readCache();
  map[String(user.id)] = user;
  writeCache(map);
}

export function getCachedBlockedUser(id: number): BlockedUserCache | null {
  const map = readCache();
  return map[String(id)] ?? null;
}

export function clearCachedBlockedUser(id: number) {
  const map = readCache();
  delete map[String(id)];
  writeCache(map);
}

export function getCachedBlockedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const arr = JSON.parse(localStorage.getItem(IDS_KEY) ?? "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export function setCachedBlockedIds(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/**
 * Fetch the current user's blocked id list and update the local cache.
 * Returns the latest list. Used to seed client-side filtering on app load.
 */
export async function fetchBlockedIds(): Promise<number[]> {
  try {
    const res = await fetch("/api/users/me/blocked");
    if (!res.ok) return getCachedBlockedIds();
    const data = await res.json();
    const ids = Array.isArray(data?.blockedIds) ? data.blockedIds : [];
    setCachedBlockedIds(ids);
    return ids;
  } catch {
    return getCachedBlockedIds();
  }
}
