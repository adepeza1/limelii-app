"use client";

import { useEffect, useState } from "react";

export default function MobileCallbackPage() {
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const search = window.location.search;
    const url = search.includes("code=")
      ? `com.limelii.app://callback${search}`
      : `com.limelii.app://callback?error=no_code`;
    setDeepLink(url);

    // Try the auto-redirect (works on some iOS versions / contexts).
    // SFSafariViewController silently cancels JS-driven custom-scheme
    // navigation on most iOS versions, so we also show a tap-to-continue
    // button as a reliable fallback after a short delay.
    window.location.href = url;
    const t = setTimeout(() => setShowFallback(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      gap: "1.5rem",
    }}>
      <p style={{ color: "#667085", fontSize: "1rem" }}>Completing sign in…</p>

      {showFallback && deepLink && (
        <a
          href={deepLink}
          style={{
            padding: "0.875rem 1.5rem",
            borderRadius: "0.75rem",
            background: "linear-gradient(135deg, #FB6983, #FF9A56)",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Return to Limelii
        </a>
      )}
    </div>
  );
}
