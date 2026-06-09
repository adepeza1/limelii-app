"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { LocateFixed } from "lucide-react";
import { LimeliiLogo } from "@/components/limelii-logo";
import { getCurrentCoords, getLocationPermission } from "@/lib/geolocation";
import { fetchRightNowFeed, NYC_CENTER } from "@/lib/right-now/feed";
import type { RightNowCard, RnCategory } from "@/lib/right-now/types";
import { RightNowCardView } from "@/components/right-now/right-now-card";

const TABS: { key: "all" | RnCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tables", label: "Tables" },
  { key: "events", label: "Events" },
  { key: "activities", label: "Activities" },
];

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "short",
    day: "numeric",
  })
    .format(new Date())
    .toUpperCase();
}

export function RightNowFeed() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [cards, setCards] = useState<RightNowCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | RnCategory>("all");

  // On mount: use location only if already granted (no unsolicited prompt);
  // otherwise fall back to central NYC so the feed still shows something.
  useEffect(() => {
    let cancelled = false;
    getLocationPermission().then(async (state) => {
      if (cancelled) return;
      if (state === "granted") {
        try {
          const c = await getCurrentCoords();
          if (!cancelled) setCoords(c);
          return;
        } catch {
          /* fall through */
        }
      }
      if (!cancelled) {
        setCoords(NYC_CENTER);
        setUsingFallback(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    fetchRightNowFeed({ lat: coords.lat, lng: coords.lng, radius: 2 })
      .then((c) => setCards(c))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [coords]);

  const requestLocation = useCallback(async () => {
    try {
      const c = await getCurrentCoords();
      setCoords(c);
      setUsingFallback(false);
    } catch {
      /* denied — keep fallback */
    }
  }, []);

  const visible = useMemo(
    () => (tab === "all" ? cards : cards.filter((c) => c.category === tab)),
    [cards, tab]
  );

  return (
    <div className="bg-[#fafafa] min-h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-20 bg-[#fafafa]/95 backdrop-blur-sm px-4 pb-3 border-b border-gray-100"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 44px) + 10px)" }}
      >
        <div className="flex items-center justify-between">
          <LimeliiLogo width={64} height={22} />
          <button
            onClick={requestLocation}
            aria-label="Use my location"
            className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100 active:opacity-70"
          >
            <LocateFixed className="w-4 h-4 text-[#4285F4]" strokeWidth={2} />
          </button>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-gray-900" style={{ fontFamily: "Poppins, serif" }}>
          Right Now
        </h1>
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 mt-0.5">
          {todayLabel()} · {usingFallback ? "CENTRAL NYC" : "NEAR YOU"}
        </p>

        {/* Tabs */}
        <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {usingFallback && (
        <button
          onClick={requestLocation}
          className="mx-4 mt-3 w-[calc(100%-2rem)] text-left text-xs text-[#4285F4] bg-blue-50 rounded-xl px-3 py-2"
        >
          Showing central NYC — tap to use your location for what&apos;s near you.
        </button>
      )}

      {/* Feed */}
      <div
        className="px-4 pt-4 flex flex-col gap-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)" }}
      >
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">Finding what&apos;s good right now…</div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500 text-sm">Nothing in this category open right now nearby.</p>
            <p className="text-gray-400 text-xs mt-1">Try the All tab, or widen later in the day.</p>
          </div>
        ) : (
          visible.map((card) => <RightNowCardView key={card.id} card={card} />)
        )}
      </div>
    </div>
  );
}
