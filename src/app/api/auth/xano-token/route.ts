import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const XANO_TOKEN_EXCHANGE_URL =
  "https://xyhl-mgrz-aokj.n7c.xano.io/api:J86-AUyj/external_token/exchange";

export async function POST() {
  console.log("[xano-token] Starting token exchange...");
  const { getIdTokenRaw, isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();
  console.log("[xano-token] Kinde authenticated:", authenticated);

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kindeIdToken = await getIdTokenRaw();
  console.log("[xano-token] Kinde ID token present:", !!kindeIdToken);

  if (!kindeIdToken) {
    return NextResponse.json(
      { error: "No Kinde ID token available" },
      { status: 401 }
    );
  }

  console.log("[xano-token] Calling Xano exchange endpoint...");
  const res = await fetch(XANO_TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ external_token: kindeIdToken }),
  });
  console.log("[xano-token] Xano response status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("[xano-token] Xano exchange failed:", res.status, text);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  const xanoToken = data.access_token;

  if (!xanoToken) {
    return NextResponse.json(
      { error: "No access_token in Xano response" },
      { status: 502 }
    );
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
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ success: true });
}
