"use client";

import { useEffect } from "react";

export default function MobileCallbackPage() {
  useEffect(() => {
    // Forward all query params (code, state, etc.) to the app via custom URL scheme.
    // Using an HTTPS redirect_uri satisfies Google's OAuth policy; this page
    // then hands off to the app without needing Safari's localStorage.
    const search = window.location.search;
    if (search.includes("code=")) {
      window.location.href = `com.limelii.app://callback${search}`;
    } else {
      window.location.href = `com.limelii.app://callback?error=no_code`;
    }
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <p style={{ color: "#667085", fontSize: "1rem" }}>Completing sign in…</p>
    </div>
  );
}
