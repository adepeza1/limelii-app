import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { XANO_DOMAIN, API_BASE } from "./xano";
export { XANO_DOMAIN, API_BASE };

const XANO_TOKEN_EXCHANGE_URL = `${XANO_DOMAIN}/api:J86-AUyj/external_token/exchange`;

// Fallback if we can't read the JWT's exp claim. 24 hours is conservative
// enough that an inactive user gets cleanly redirected to login (instead
// of stuck on a stale-cookie state) but long enough to avoid login churn.
const COOKIE_TTL_FALLBACK_SECONDS = 60 * 60 * 24;
// Subtract from the JWT's actual expiry so the cookie disappears just
// before the token dies — avoids the edge where the cookie is sent but
// the token is already invalid.
const COOKIE_TTL_BUFFER_SECONDS = 60;

/**
 * Compute the cookie max-age (seconds) for a Xano JWT by reading its
 * `exp` claim. Falls back to a conservative default when we can't parse it.
 * Caller controls clock skew via the buffer constant.
 */
export function xanoTokenMaxAge(token: string): number {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return COOKIE_TTL_FALLBACK_SECONDS;
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
    if (typeof payload.exp !== "number") return COOKIE_TTL_FALLBACK_SECONDS;
    const remaining = payload.exp - Math.floor(Date.now() / 1000) - COOKIE_TTL_BUFFER_SECONDS;
    if (remaining <= 0) return COOKIE_TTL_FALLBACK_SECONDS;
    return remaining;
  } catch {
    return COOKIE_TTL_FALLBACK_SECONDS;
  }
}

/**
 * Mint a fresh Kinde id_token using a stored refresh_token. Used for the
 * mobile path where the WebView has no Kinde session cookies on the
 * Vercel origin, so the Kinde Next.js SDK has nothing to refresh from.
 * Rotates the kinde_refresh cookie if Kinde returns a new refresh_token
 * (which is the default on most Kinde configurations).
 */
async function refreshKindeIdTokenFromCookie(refreshToken: string): Promise<string> {
  const res = await fetch(`${process.env.KINDE_ISSUER_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.KINDE_CLIENT_ID!,
      client_secret: process.env.KINDE_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Kinde refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const idToken: string | undefined = data.id_token;
  if (!idToken) {
    throw new Error("No Kinde ID token available after refresh");
  }

  // Rotate the cookie if Kinde returned a new refresh_token. If the same
  // token is reused (rotation off), we re-set it anyway to extend the
  // 30-day window so active users don't time out.
  const rotated: string = data.refresh_token ?? refreshToken;
  const cookieStore = await cookies();
  cookieStore.set("kinde_refresh", rotated, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return idToken;
}

/**
 * Refresh the Kinde session and exchange for a new Xano token.
 * Writes the new token to the xano_token cookie and returns it.
 */
export async function refreshXanoToken(): Promise<string> {
  const cookieStore = await cookies();
  const kindeRefresh = cookieStore.get("kinde_refresh")?.value;

  let kindeIdToken: string | null;
  if (kindeRefresh) {
    // Mobile path: refresh via the stored refresh_token directly. The
    // Kinde SDK can't help here — the WebView has no Kinde session
    // cookies because mobile auth happens in SFSafariViewController.
    kindeIdToken = await refreshKindeIdTokenFromCookie(kindeRefresh);
  } else {
    // Web path: SDK reads the Kinde session cookies set during the
    // /api/auth/login handler and rotates them in place.
    const session = getKindeServerSession();
    await session.refreshTokens();
    kindeIdToken = await session.getIdTokenRaw();
  }

  if (!kindeIdToken) {
    throw new Error("No Kinde ID token available after refresh");
  }

  const res = await fetch(XANO_TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ external_token: kindeIdToken }),
  });

  if (!res.ok) {
    throw new Error(`Xano token exchange failed: ${res.status}`);
  }

  const data = await res.json();
  const xanoToken = data.access_token;

  if (!xanoToken) {
    throw new Error("No access_token in Xano exchange response");
  }

  const isSecure =
    process.env.NODE_ENV === "production" ||
    (process.env.KINDE_SITE_URL ?? "").startsWith("https");
  cookieStore.set("xano_token", xanoToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: xanoTokenMaxAge(xanoToken),
  });

  return xanoToken;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  base: string = API_BASE
): Promise<Response> {
  const cookieStore = await cookies();
  let xanoToken = cookieStore.get("xano_token")?.value;

  const makeRequest = (token: string | undefined) => {
    const headers = new Headers(options.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${base}${path}`, { ...options, headers });
  };

  const response = await makeRequest(xanoToken);

  // If 401, attempt to refresh the token and retry once
  if (response.status === 401) {
    try {
      xanoToken = await refreshXanoToken();
      return makeRequest(xanoToken);
    } catch (err) {
      // Refresh failed — log so we can identify affected users in Vercel
      // logs, then return the original 401. Most callers swallow this
      // silently, which is why users get stuck on broken-looking pages.
      const errMsg = err instanceof Error ? err.message : String(err);
      let kindeId: string | undefined;
      try {
        const u = await getKindeServerSession().getUser();
        kindeId = u?.id ?? undefined;
      } catch {}
      console.error(
        `[token-fail] step=api-fetch-retry path=${path} kindeId=${kindeId ?? "?"} err=${errMsg}`
      );

      // If the auth chain is structurally broken (no Kinde session to
      // refresh from, refresh_token rejected, or Xano rejected the
      // id_token), the cookies are unrecoverable. Clear them so middleware
      // redirects cleanly to login on the next nav instead of letting the
      // user sit on a page making API calls that 401 forever. Skip
      // clearing for transient errors like network failures — those can
      // recover on the next call.
      const isAuthChainBroken =
        errMsg.includes("No Kinde ID token available") ||
        errMsg.includes("Kinde refresh failed") ||
        errMsg.includes("Xano token exchange failed") ||
        errMsg.includes("No access_token in Xano exchange response");
      if (isAuthChainBroken) {
        cookieStore.delete("xano_token");
        cookieStore.delete("mobile_authed");
        cookieStore.delete("kinde_refresh");
      }

      return response;
    }
  }

  return response;
}
