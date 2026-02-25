"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function exchangeToken() {
      try {
        console.log("[auth/callback] Starting Xano token exchange...");
        const res = await fetch("/api/auth/xano-token", { method: "POST" });
        console.log("[auth/callback] Response status:", res.status);

        if (!res.ok) {
          const data = await res.json();
          console.error("[auth/callback] Exchange failed:", data);
          setError(data.error || "Token exchange failed");
          return;
        }

        console.log("[auth/callback] Token exchange successful, redirecting to /profile");
        router.replace("/profile");
      } catch (err) {
        setError("Something went wrong during login");
        console.error("[auth/callback] Token exchange error:", err);
      }
    }

    exchangeToken();
  }, [router]);

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Login error: {error}</p>
        <a href="/api/auth/login">Try again</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Completing login...</p>
    </div>
  );
}
