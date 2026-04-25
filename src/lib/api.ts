import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { XANO_DOMAIN, API_BASE } from "./xano";
export { XANO_DOMAIN, API_BASE };

const XANO_TOKEN_EXCHANGE_URL = `${XANO_DOMAIN}/api:J86-AUyj/external_token/exchange`;

/**
 * Refresh the Kinde session and exchange for a new Xano token.
 * Writes the new token to the xano_token cookie and returns it.
 */
export async function refreshXanoToken(): Promise<string> {
  const session = getKindeServerSession();

  // Refresh Kinde tokens to ensure the ID token is valid
  await session.refreshTokens();

  const kindeIdToken = await session.getIdTokenRaw();
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

  const cookieStore = await cookies();
  const isSecure =
    process.env.NODE_ENV === "production" ||
    (process.env.KINDE_SITE_URL ?? "").startsWith("https");
  cookieStore.set("xano_token", xanoToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
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
    } catch {
      // Refresh failed — return the original 401
      return response;
    }
  }

  return response;
}
