"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generatePKCE } from "@/lib/pkce";

export default function LoginPage() {
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

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

    return () => { listenerRef.current?.remove(); };
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ Browser }, { App }] = await Promise.all([
        import("@capacitor/browser"),
        import("@capacitor/app"),
      ]);

      const { verifier, challenge } = await generatePKCE();
      sessionStorage.setItem("pkce_verifier", verifier);

      const res = await fetch(`/api/auth/mobile-login?challenge=${encodeURIComponent(challenge)}`);
      const { url } = await res.json();

      listenerRef.current?.remove();
      listenerRef.current = await App.addListener("appUrlOpen", async (data) => {
        listenerRef.current?.remove();
        try {
          const cbUrl = new URL(data.url);
          const code = cbUrl.searchParams.get("code");
          const storedVerifier = sessionStorage.getItem("pkce_verifier");

          if (!code || !storedVerifier) {
            setError("Sign in failed. Please try again.");
            return;
          }

          const exchangeRes = await fetch("/api/auth/mobile-exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, verifier: storedVerifier }),
          });

          if (exchangeRes.ok) {
            const params = new URLSearchParams(window.location.search);
            router.replace(params.get("redirect_to") || "/");
          } else {
            setError("Sign in failed. Please try again.");
          }
        } finally {
          await Browser.close();
          setLoading(false);
        }
      });

      await Browser.open({ url });
    } catch (err) {
      console.error("[login] sign in error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
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
          <p style={{ textAlign: "center", color: "#FB6983", fontSize: "0.875rem" }}>
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
