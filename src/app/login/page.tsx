"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LimeliiLogo } from "@/components/limelii-logo";
import { storeRefreshToken, getStoredRefreshToken, clearStoredRefreshToken } from "@/lib/native-auth-store";

function postLoginDestination(): string {
  const params = new URLSearchParams(window.location.search);
  const dest = params.get("redirect_to") || params.get("post_login_redirect_url") || "/";
  return dest.startsWith("/") ? dest : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    const capacitor = (window as any).Capacitor;
    if (!capacitor?.isNativePlatform?.()) {
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect_to") || "/";
      const postLogin = encodeURIComponent(`/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`);
      window.location.href = `/api/auth/login?post_login_redirect_url=${postLogin}`;
      return;
    }
    setIsCapacitor(true);

    // Native: before showing the login button, try to silently restore the
    // session from the refresh token in native storage. WKWebView may have
    // evicted the auth cookies even though the user never logged out —
    // rehydrate re-sets the cookies without a re-login. If there's no stored
    // token (web, older binary, or genuinely logged out) or it's been
    // revoked, fall through to the login UI.
    (async () => {
      try {
        const token = await getStoredRefreshToken();
        if (token) {
          const res = await fetch("/api/auth/mobile-rehydrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: token }),
          });
          if (res.ok) {
            const body = await res.json().catch(() => ({}));
            if (body.refresh_token) await storeRefreshToken(body.refresh_token);
            window.location.href = postLoginDestination();
            return;
          }
          // 401 = refresh token is dead; drop it so we don't retry it.
          if (res.status === 401) await clearStoredRefreshToken();
        }
      } catch {
        /* fall through to the login UI */
      }
      setBootstrapping(false);
    })();

    return () => { listenerRef.current?.remove(); };
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const res = await fetch(`/api/auth/mobile-login`);
      if (!res.ok) throw new Error(`Login request failed: ${res.status}`);
      const { url } = await res.json();

      listenerRef.current?.remove();
      listenerRef.current = await App.addListener("appUrlOpen", async (data) => {
        listenerRef.current?.remove();
        listenerRef.current = null;
        await Browser.close().catch(() => {});
        try {
          const cbUrl = new URL(data.url);
          const code = cbUrl.searchParams.get("code");

          if (!code) {
            setError(`Missing code in callback`);
            return;
          }

          const exchangeRes = await fetch("/api/auth/mobile-exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });

          const body = await exchangeRes.json();

          if (exchangeRes.ok) {
            // Mirror the refresh token into native storage so the session
            // survives WKWebView cookie eviction (rehydrated on next launch).
            if (body.refresh_token) await storeRefreshToken(body.refresh_token);
            window.location.href = postLoginDestination();
          } else {
            setError(`Exchange failed: ${body.error} — ${JSON.stringify(body.detail)}`);
          }
        } catch (e) {
          setError(`Error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setLoading(false);
        }
      });

      await Browser.open({ url, presentationStyle: "popover" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
      setLoading(false);
    }
  };

  if (!isCapacitor || bootstrapping) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#FCE5D8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "calc(env(safe-area-inset-top) + 4rem)",
      paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
      paddingLeft: "1.5rem",
      paddingRight: "1.5rem",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", width: "100%" }}>
        <LimeliiLogo width={260} height={102} />
        <p style={{
          color: "#f78539",
          fontSize: "0.95rem",
          fontWeight: 600,
          letterSpacing: "0.01em",
          margin: 0,
        }}>
          Where Experiences Begin
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "1.05rem 1rem",
            borderRadius: "999px",
            border: "none",
            background: loading ? "#FB6983" : "linear-gradient(135deg, #FB6983, #FF9A56)",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 8px 24px rgba(251, 105, 131, 0.25)",
            transition: "transform 0.1s ease, opacity 0.2s ease",
          }}
        >
          {loading ? "Signing in…" : "Continue"}
        </button>

        {error && (
          <p style={{ textAlign: "center", color: "#B42318", fontSize: "0.75rem", wordBreak: "break-word", margin: 0 }}>
            {error}
          </p>
        )}

        <p style={{
          color: "#667085",
          fontSize: "0.7rem",
          textAlign: "center",
          margin: "0.5rem 0 0",
          lineHeight: 1.5,
        }}>
          By continuing you agree to our<br />
          <a href="/privacy" style={{ color: "#667085", textDecoration: "underline" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
