import { NextRequest, NextResponse } from "next/server";
import { XANO_DOMAIN } from "@/lib/xano";

const XANO_TOKEN_EXCHANGE_URL = `${XANO_DOMAIN}/api:J86-AUyj/external_token/exchange`;

export async function POST(req: NextRequest) {
  const { code, verifier } = await req.json();
  if (!code || !verifier) {
    return NextResponse.json({ error: "Missing code or verifier" }, { status: 400 });
  }

  // Exchange auth code + PKCE verifier for Kinde tokens
  const tokenRes = await fetch(`${process.env.KINDE_ISSUER_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KINDE_CLIENT_ID!,
      client_secret: process.env.KINDE_CLIENT_SECRET!,
      code,
      redirect_uri: "com.limelii.app://callback",
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    console.error("[mobile-exchange] Kinde token exchange failed:", err);
    return NextResponse.json({ error: "Kinde exchange failed", detail: err }, { status: 400 });
  }

  const tokenBody = await tokenRes.json();
  const { id_token } = tokenBody;
  if (!id_token) {
    console.error("[mobile-exchange] No id_token in Kinde response:", tokenBody);
    return NextResponse.json({ error: "No id_token returned", detail: tokenBody }, { status: 400 });
  }

  // Exchange Kinde id_token for Xano token (same flow as web auth)
  const xanoRes = await fetch(XANO_TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ external_token: id_token }),
  });

  if (!xanoRes.ok) {
    console.error("[mobile-exchange] Xano exchange failed:", xanoRes.status);
    return NextResponse.json({ error: "Xano exchange failed" }, { status: 502 });
  }

  const { access_token } = await xanoRes.json();

  const response = NextResponse.json({ success: true });
  response.cookies.set("xano_token", access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
