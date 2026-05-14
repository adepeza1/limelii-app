import { NextRequest, NextResponse } from "next/server";
import { XANO_DOMAIN } from "@/lib/xano";
import { xanoTokenMaxAge } from "@/lib/api";

const XANO_TOKEN_EXCHANGE_URL = `${XANO_DOMAIN}/api:J86-AUyj/external_token/exchange`;

function kindeSubFromIdToken(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return undefined;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
    return typeof claims.sub === "string" ? claims.sub : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const tokenRes = await fetch(`${process.env.KINDE_ISSUER_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KINDE_CLIENT_ID!,
      client_secret: process.env.KINDE_CLIENT_SECRET!,
      code,
      redirect_uri: "https://limelii-app.vercel.app/auth/mobile-callback",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    console.error(
      `[token-fail] step=mobile-kinde-exchange status=${tokenRes.status} err=${JSON.stringify(err)}`
    );
    return NextResponse.json({ error: "Kinde exchange failed", detail: err }, { status: 400 });
  }

  const tokenBody = await tokenRes.json();
  const { id_token } = tokenBody;
  if (!id_token) {
    console.error(`[token-fail] step=mobile-no-id-token body=${JSON.stringify(tokenBody)}`);
    return NextResponse.json({ error: "No id_token returned", detail: tokenBody }, { status: 400 });
  }

  // Exchange Kinde id_token for Xano token (same flow as web auth)
  const xanoRes = await fetch(XANO_TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ external_token: id_token }),
  });

  if (!xanoRes.ok) {
    console.error(
      `[token-fail] step=mobile-xano-exchange status=${xanoRes.status} kindeSub=${kindeSubFromIdToken(id_token) ?? "?"}`
    );
    return NextResponse.json({ error: "Xano exchange failed" }, { status: 502 });
  }

  const { access_token } = await xanoRes.json();

  const cookieMaxAge = xanoTokenMaxAge(access_token);
  const response = NextResponse.json({ success: true });
  response.cookies.set("xano_token", access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: cookieMaxAge,
    path: "/",
  });
  // Non-httpOnly flag so client-side JS can detect mobile auth state.
  // Same lifetime as xano_token so the two cookies expire together.
  response.cookies.set("mobile_authed", "1", {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: cookieMaxAge,
    path: "/",
  });

  return response;
}
