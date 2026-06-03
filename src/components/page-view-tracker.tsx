"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/mixpanel";

// Fires Page Viewed on every route change. Mounts once in the root layout
// (wrapped in <Suspense> there because of useSearchParams). The `path` prop
// lets Mixpanel funnels split by tab — e.g. path=/ for Discover, /plan for
// the Explore tab (now ?view=explore on the home page), /saved for Collections.
// Group experience-detail pages under /experience/ rather than tracking
// individual ids so Mixpanel doesn't see a million one-off paths.
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The Explore experience now lives on the Discover home page as an in-page
  // tab (?view=explore). Read it so switching tabs fires its own Page Viewed.
  const view = searchParams.get("view");

  useEffect(() => {
    if (!pathname) return;
    const bucket = bucketPath(pathname, view);
    track("Page Viewed", { path: bucket, raw_path: pathname });
  }, [pathname, view]);

  return null;
}

function bucketPath(p: string, view: string | null): string {
  // Keep the Explore tab on its historical /plan bucket so existing funnels
  // that split Discover vs Explore keep working after the merge.
  if (p === "/") return view === "explore" ? "/plan" : "/";
  if (p.startsWith("/experience/")) return "/experience/:id";
  if (p.startsWith("/c/")) return "/c/:token";
  if (p.startsWith("/users/")) return "/users/:id";
  return p;
}
