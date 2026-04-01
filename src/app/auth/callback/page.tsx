"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function exchangeToken() {
      try {
        const res = await fetch("/api/auth/xano-token", { method: "POST" });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Token exchange failed");
          return;
        }

        // Check if user needs onboarding — redirect if no username or fetch fails
        let needsOnboarding = true;
        const userRes = await fetch("/api/user/me");
        if (userRes.ok) {
          const user = await userRes.json();
          needsOnboarding = !user.username;
        }
        if (needsOnboarding) {
          router.replace("/onboarding");
          return;
        }

        // Read redirect_to from URL without useSearchParams (avoids Suspense issues)
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirect_to");
        router.replace(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/");
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
