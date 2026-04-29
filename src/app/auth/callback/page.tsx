"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function exchangeToken() {
      try {
        // Try the existing session first — if the user already has a valid Xano
        // token (e.g. arriving here after /onboarding), this avoids a redundant
        // exchange and the second /api/user/me call that can stall.
        let user: { id?: number; username?: string } | null = null;

        // redirect: "manual" prevents fetch from following a middleware 307
        // redirect to /auth/callback (which would return HTML, not JSON).
        const initialMeRes = await fetch("/api/user/me", { redirect: "manual" });
        if (initialMeRes.ok) {
          user = await initialMeRes.json().catch(() => null);
        }

        // No valid session yet — do the Kinde → Xano token exchange
        if (!user?.id) {
          const exchangeRes = await fetch("/api/auth/xano-token", { method: "POST" });
          if (!exchangeRes.ok) {
            const data = await exchangeRes.json().catch(() => ({}));
            setError(data.error || "Token exchange failed");
            return;
          }

          const meRes = await fetch("/api/user/me");
          if (meRes.ok) {
            user = await meRes.json();
          }
        }

        if (!user?.username) {
          window.location.href = "/onboarding";
          return;
        }

        // Read redirect_to from URL without useSearchParams (avoids Suspense issues)
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirect_to");
        window.location.href = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
      } catch (err) {
        setError("Something went wrong during login");
        console.error("[auth/callback] error:", err);
      }
    }

    exchangeToken();
  }, [router]);

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Login error: {error}</p>
        <a href="/login">Try again</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Completing login...</p>
    </div>
  );
}
