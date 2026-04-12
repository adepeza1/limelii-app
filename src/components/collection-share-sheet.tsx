"use client";

import { useEffect, useState } from "react";
import { X, Search, Check } from "lucide-react";

export interface ShareUser {
  id: number;
  username: string;
  name?: string;
  photo?: string;
}

// Generic share sheet — reused by both collections and experiences
interface ShareSheetProps {
  title: string;
  subtitle: string;
  onSend: (userIds: number[]) => Promise<void>;
  onClose: () => void;
}

export function ShareSheet({ title, subtitle, onSend, onClose }: ShareSheetProps) {
  const [followedUsers, setFollowedUsers] = useState<ShareUser[]>([]);
  const [searchResults, setSearchResults] = useState<ShareUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me/following/profiles")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFollowedUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter following list; supplement with search API for non-followers
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const fromFollowing = followedUsers.filter(
      (u) => u.username.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)
    );
    setSearchResults(fromFollowing);

    const controller = new AbortController();
    fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : [])
      .then((data: ShareUser[]) => {
        if (!Array.isArray(data)) return;
        const followIds = new Set(followedUsers.map((u) => u.id));
        const extra = data.filter((u) => !followIds.has(u.id));
        setSearchResults([...fromFollowing, ...extra]);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [searchQuery, followedUsers]);

  const displayList = searchQuery.trim() ? searchResults : followedUsers;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (!selected.size || sending || sent) return;
    setSending(true);
    try {
      await onSend(Array.from(selected));
      setSent(true);
      setTimeout(onClose, 1200);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[900] bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[901] bg-white rounded-t-3xl max-h-[80vh] flex flex-col max-w-5xl mx-auto">
        <div className="w-10 h-1 rounded-full bg-[#D0D5DD] mx-auto mt-3 mb-4 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <div>
            <p className="text-[#101828] font-semibold text-base">{title}</p>
            <p className="text-[#667085] text-xs mt-0.5 truncate max-w-[240px]">{subtitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F4F7]">
            <X size={16} className="text-[#667085]" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-2xl px-3 py-2.5">
            <Search size={14} className="text-[#98A2B3] shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or @username…"
              className="flex-1 text-sm text-[#101828] placeholder:text-[#98A2B3] bg-transparent outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {loading ? (
            <p className="text-sm text-[#667085] text-center py-10">Loading…</p>
          ) : displayList.length === 0 ? (
            <p className="text-sm text-[#667085] text-center py-10">
              {searchQuery.trim() ? "No users found" : "Follow someone to share with them"}
            </p>
          ) : (
            <div className="flex flex-col">
              {!searchQuery.trim() && (
                <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">
                  People you follow
                </p>
              )}
              {displayList.map((user) => {
                const isSelected = selected.has(user.id);
                const initials = user.username.slice(0, 2).toUpperCase();
                return (
                  <button
                    key={user.id}
                    onClick={() => toggle(user.id)}
                    className="flex items-center gap-3 py-2.5 w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center text-sm font-bold text-[#667085] shrink-0 overflow-hidden">
                      {user.photo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={user.photo} alt={user.username} className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      {user.name && <p className="text-sm font-semibold text-[#101828] leading-tight truncate">{user.name}</p>}
                      <p className="text-sm text-[#667085]">@{user.username}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-[#FB6983] border-[#FB6983]" : "border-[#D0D5DD]"
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Send button */}
        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-2 shrink-0 border-t border-[#EAECF0]">
          <button
            onClick={handleSend}
            disabled={!selected.size || sending || sent}
            className="w-full py-3 rounded-2xl bg-[#FB6983] text-white font-semibold text-sm disabled:opacity-40 transition-colors"
          >
            {sent ? "Sent!" : sending ? "Sending…" : `Send${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}

// Thin wrapper kept for backward compatibility with browse-collection-card
interface CollectionShareSheetProps {
  collectionId: number;
  collectionName: string;
  onClose: () => void;
}

export function CollectionShareSheet({ collectionId, collectionName, onClose }: CollectionShareSheetProps) {
  return (
    <ShareSheet
      title="Share collection"
      subtitle={collectionName}
      onClose={onClose}
      onSend={async (userIds) => {
        await Promise.all(
          userIds.map((userId) =>
            fetch(`/api/collections/${collectionId}/share-to-user`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipient_user_id: userId }),
            })
          )
        );
      }}
    />
  );
}
