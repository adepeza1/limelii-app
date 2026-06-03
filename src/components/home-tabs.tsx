"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DiscoveryResponse } from "@/app/page";
import type { HomeView } from "@/components/view-toggle";
import { DiscoverPage } from "@/components/discover-page";
import { ExploreView } from "@/components/explore-view";

export function HomeTabs({ data }: { data: DiscoveryResponse }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The ?view= param as a stable string so effects below don't re-run on every
  // render (useSearchParams() returns a fresh object identity each render).
  const viewParam = searchParams.get("view");
  const initial: HomeView = viewParam === "explore" ? "explore" : "discover";
  const [view, setView] = useState<HomeView>(initial);
  // Explore loads Leaflet + its own fetch — only mount it once it's first opened.
  const [exploreMounted, setExploreMounted] = useState(initial === "explore");

  const selectView = useCallback(
    (next: HomeView) => {
      setView(next);
      if (next === "explore") setExploreMounted(true);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "explore") params.set("view", "explore");
      else params.delete("view");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Stay in sync when the URL changes externally (e.g. a /?view=explore link
  // clicked while already on this page). Keyed on the param value, not the
  // searchParams object, so a user's toggle click isn't immediately reverted.
  useEffect(() => {
    const v: HomeView = viewParam === "explore" ? "explore" : "discover";
    setView(v);
    if (v === "explore") setExploreMounted(true);
  }, [viewParam]);

  return (
    <>
      {/* Discover — normal document flow; the toggle lives in its header. */}
      <div style={{ display: view === "discover" ? "block" : "none" }}>
        <DiscoverPage data={data} view={view} onSelectView={selectView} />
      </div>

      {/* Explore — fixed full-screen overlay. Lazy-mounted, then kept alive with
          visibility (not display:none) so the Leaflet map keeps its size. */}
      {exploreMounted && (
        <div style={{ visibility: view === "explore" ? "visible" : "hidden" }}>
          <Suspense fallback={<div className="bg-white min-h-screen" />}>
            <ExploreView view={view} onSelectView={selectView} />
          </Suspense>
        </div>
      )}
    </>
  );
}
