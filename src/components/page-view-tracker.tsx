"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/mixpanel";

// Fires Page Viewed on every route change. Mounts once in the root
// layout. The `path` prop lets Mixpanel funnels split by tab — e.g.
// path=/ for Discover, /plan for Explore, /saved for Collections.
// Group experience-detail pages under /experience/ rather than tracking
// individual ids so Mixpanel doesn't see a million one-off paths.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const bucket = bucketPath(pathname);
    track("Page Viewed", { path: bucket, raw_path: pathname });
  }, [pathname]);

  return null;
}

function bucketPath(p: string): string {
  if (p.startsWith("/experience/")) return "/experience/:id";
  if (p.startsWith("/c/")) return "/c/:token";
  if (p.startsWith("/users/")) return "/users/:id";
  return p;
}
