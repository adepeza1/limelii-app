"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MobileCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const verifier = localStorage.getItem("pkce_verifier");

    if (!code || !verifier) {
      router.replace("/login");
      return;
    }

    fetch("/api/auth/mobile-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, verifier }),
    })
      .then((res) => {
        localStorage.removeItem("pkce_verifier");
        if (res.ok) {
          router.replace("/");
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"));
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
    }}>
      <p style={{ color: "#667085", fontSize: "1rem" }}>Completing sign in…</p>
    </div>
  );
}
