import { NextRequest, NextResponse } from "next/server";
import { XANO_DOMAIN } from "@/lib/xano";
import { xanoTokenMaxAge } from "@/lib/api";

const XANO_TOKEN_EXCHANGE_URL = `${XANO_DOMAIN}/api:J86-AUyj/external_token/exchange`;

// Rehydrate a mobile session from a refresh token held in native storage.
//
// When WKWebView evicts the auth cookies, the app cold-starts signed out.
// The client reads the refresh token it mirrored into Capacitor Preferences
// and POSTs it here; we mint a fresh Kinde id_token, exchange it for a Xano
// token, and re-set the cookies — restoring the session without a re-login.
//
// Returns the (possibly rotated) refresh_token so the client can update its
// native copy; Kinde rotates refresh tokens on use, so the old one is
// single-use and must be replaced.
export async function POST(req: NextRequest) {
  const { refresh_token } = await req.json().catch(() => ({}));
  if (!refresh_token) {
    return NextResponse.json({ error: "Missing refresh_token" }, { status: 400 });
  }

  const tokenRes = await fetch(`${process.env.KINDE_ISSUER_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.KINDE_CLIENT_ID!,
      client_secret: process.env.KINDE_CLIENT_SECRET!,
      refresh_token,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => "");
    console.error(
      `[token-fail] step=rehydrate-kinde status=${tokenRes.status} body=${err.slice(0, 200).replace(/\s+/g, " ")}`
    );
    // 401 tells the client this refresh token is dead — it should clear it
    // and fall back to a full login.
    return NextResponse.json({ error: "Kinde refresh failed" }, { status: 401 });
  }

  const tokenBody = await tokenRes.json();
  const { id_token, refresh_token: rotated } = tokenBody;
  if (!id_token) {
    console.error(`[token-fail] step=rehydrate-no-id-token`);
    return NextResponse.json({ error: "No id_token returned" }, { status: 401 });
  }

  const xanoRes = await fetch(XANO_TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ external_token: id_token }),
  });
  if (!xanoRes.ok) {
    console.error(`[token-fail] step=rehydrate-xano status=${xanoRes.status}`);
    return NextResponse.json({ error: "Xano exchange failed" }, { status: 502 });
  }

  const { access_token } = await xanoRes.json();
  if (!access_token) {
    return NextResponse.json({ error: "No access_token in Xano response" }, { status: 502 });
  }

  const nextRefresh: string = rotated ?? refresh_token;
  const cookieMaxAge = xanoTokenMaxAge(access_token);
  const response = NextResponse.json({ success: true, refresh_token: nextRefresh });
  response.cookies.set("xano_token", access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: cookieMaxAge,
    path: "/",
  });
  response.cookies.set("mobile_authed", "1", {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: cookieMaxAge,
    path: "/",
  });
  response.cookies.set("kinde_refresh", nextRefresh, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
