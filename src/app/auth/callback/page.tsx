"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

        // Redirect to original destination if provided, otherwise home
        const redirectTo = searchParams.get("redirect_to");
        router.replace(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/");
      } catch (err) {
        setError("Something went wrong during login");
        console.error("[auth/callback] error:", err);
      }
    }

    exchangeToken();
  }, [router, searchParams]);

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

import { Suspense } from "react";

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}
