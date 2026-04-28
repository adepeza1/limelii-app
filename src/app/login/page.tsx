"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registerPlugin } from "@capacitor/core";
import { generatePKCE } from "@/lib/pkce";

const NativeAuth = registerPlugin<{
  openAuth: (options: { url: string }) => Promise<{ url: string }>;
}>("NativeAuth");

export default function LoginPage() {
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.isNativePlatform?.()) {
      setIsCapacitor(true);
    } else {
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect_to") || "/";
      const postLogin = encodeURIComponent(`/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`);
      window.location.href = `/api/auth/login?post_login_redirect_url=${postLogin}`;
    }
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { verifier, challenge } = await generatePKCE();
      localStorage.setItem("pkce_verifier", verifier);

      const res = await fetch(`/api/auth/mobile-login?challenge=${encodeURIComponent(challenge)}`);
      if (!res.ok) throw new Error(`Login request failed: ${res.status}`);
      const { url } = await res.json();

      // ASWebAuthenticationSession — Google-approved OAuth browser on iOS.
      // Returns the full callback URL directly (no appUrlOpen listener needed).
      const { url: callbackUrl } = await NativeAuth.openAuth({ url });

      const cbUrl = new URL(callbackUrl);
      const code = cbUrl.searchParams.get("code");
      const storedVerifier = localStorage.getItem("pkce_verifier");

      if (!code || !storedVerifier) {
        setError(`Missing: code=${!!code} verifier=${!!storedVerifier}`);
        return;
      }

      const exchangeRes = await fetch("/api/auth/mobile-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, verifier: storedVerifier }),
      });

      const body = await exchangeRes.json();

      if (exchangeRes.ok) {
        localStorage.removeItem("pkce_verifier");
        const params = new URLSearchParams(window.location.search);
        router.replace(params.get("redirect_to") || "/");
      } else {
        setError(`Exchange failed: ${body.error} — ${JSON.stringify(body.detail)}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== "cancelled") setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isCapacitor) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      paddingTop: "calc(env(safe-area-inset-top) + 2rem)",
      gap: "2rem",
    }}>
      <img src="/limelii-logo.svg" alt="Limelii" width={160} height={48} style={{ objectFit: "contain" }} />

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "linear-gradient(135deg, #FB6983, #FF9A56)",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in…" : "Continue"}
        </button>

        {error && (
          <p style={{ textAlign: "center", color: "#FB6983", fontSize: "0.75rem", wordBreak: "break-all" }}>
            {error}
          </p>
        )}
      </div>

      <p style={{ color: "#667085", fontSize: "0.75rem", textAlign: "center" }}>
        By continuing you agree to our Terms & Privacy Policy
      </p>
    </div>
  );
}
